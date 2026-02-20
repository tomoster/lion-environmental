#!/usr/bin/env node

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, "..", ".env.local");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] ||= match[2].trim();
    }
  } catch {}
}
loadEnv();

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("Missing APIFY_TOKEN. Set it in .env.local or as env var.");
  process.exit(1);
}

const ACTOR_ID = "compass~crawler-google-places";
const IMPORT_URL = "https://lion-environmental.vercel.app/api/prospects/import";
const COMPLETED_DATASET_ID = "mddVruzocsotMXG55";
const CONCURRENCY = 2;

const RUNS = [
  { borough: "Manhattan", term: "property management company", datasetId: COMPLETED_DATASET_ID },
  { borough: "Manhattan", term: "real estate management" },
  { borough: "Manhattan", term: "building management company" },
  { borough: "Manhattan", term: "apartment management" },
  { borough: "Brooklyn", term: "property management company" },
  { borough: "Brooklyn", term: "real estate management" },
  { borough: "Brooklyn", term: "building management company" },
  { borough: "Brooklyn", term: "apartment management" },
];

function buildInput(term, borough) {
  return {
    searchStringsArray: [term],
    locationQuery: `${borough}, New York, NY`,
    maxCrawledPlacesPerSearch: 500,
    language: "en",
    countryCode: "us",
    skipClosedPlaces: true,
    scrapeContacts: true,
    maxReviews: 0,
    maxImages: 0,
    maxQuestions: 0,
  };
}

async function apiFetch(path, options = {}) {
  const url = `https://api.apify.com/v2${path}`;
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}token=${APIFY_TOKEN}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify API ${res.status}: ${text}`);
  }
  return res.json();
}

async function triggerRun(term, borough) {
  const input = buildInput(term, borough);
  const data = await apiFetch(`/acts/${ACTOR_ID}/runs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return { runId: data.data.id, datasetId: data.data.defaultDatasetId };
}

async function pollRun(runId) {
  while (true) {
    const data = await apiFetch(`/actor-runs/${runId}?waitForFinish=30`);
    const status = data.data.status;
    if (status === "SUCCEEDED") return data.data.defaultDatasetId;
    if (status === "FAILED" || status === "TIMED-OUT" || status === "ABORTED") {
      throw new Error(`Run ${runId} ended with status: ${status}`);
    }
    // Still running — loop again (waitForFinish will long-poll)
  }
}

async function fetchDataset(datasetId) {
  const fields = "title,phone,email,emails,address,website,totalScore";
  const data = await apiFetch(`/datasets/${datasetId}/items?limit=1000&fields=${fields}`);
  return data;
}

function mapItems(items) {
  return items
    .filter((item) => item.title)
    .map((item) => ({
      title: item.title,
      phone: item.phone || null,
      email: (item.emails && item.emails[0]) || item.email || null,
      address: item.address || null,
      website: item.website || null,
      totalScore: item.totalScore ?? null,
    }));
}

async function importToApp(rows) {
  const res = await fetch(IMPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Import API ${res.status}: ${text}`);
  }
  return res.json();
}

async function processRun(run, index) {
  const label = `[Run ${index + 1}] ${run.borough} — "${run.term}"`;
  let datasetId = run.datasetId;

  try {
    if (datasetId) {
      console.log(`${label}: Using existing dataset ${datasetId}`);
    } else {
      console.log(`${label}: Triggering Apify run...`);
      const result = await triggerRun(run.term, run.borough);
      console.log(`${label}: Started (runId: ${result.runId}). Polling...`);
      datasetId = await pollRun(result.runId);
      console.log(`${label}: Completed! Dataset: ${datasetId}`);
    }

    console.log(`${label}: Fetching results...`);
    const items = await fetchDataset(datasetId);
    const mapped = mapItems(items);
    console.log(`${label}: Got ${items.length} raw items, ${mapped.length} with titles`);

    if (mapped.length === 0) {
      console.log(`${label}: No items to import, skipping.`);
      return { run: label, status: "empty", imported: 0, skipped: 0 };
    }

    console.log(`${label}: Importing ${mapped.length} items...`);
    const result = await importToApp(mapped);
    console.log(`${label}: Imported ${result.imported}, skipped ${result.skipped} dupes`);
    return { run: label, status: "ok", imported: result.imported, skipped: result.skipped };
  } catch (err) {
    console.error(`${label}: FAILED — ${err.message}`);
    return { run: label, status: "error", error: err.message };
  }
}

async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  const queue = [...tasks];

  async function worker() {
    while (queue.length > 0) {
      const { run, index } = queue.shift();
      const result = await processRun(run, index);
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log("=== Apify Scrape & Import Pipeline ===\n");
  console.log(`Runs to process: ${RUNS.length}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Import target: ${IMPORT_URL}\n`);

  // Process run 1 (existing dataset) first, sequentially
  console.log("--- Phase 1: Import existing dataset ---\n");
  const firstResult = await processRun(RUNS[0], 0);

  // Process runs 2-8 with concurrency
  console.log("\n--- Phase 2: Trigger & import remaining runs (2 concurrent) ---\n");
  const remainingTasks = RUNS.slice(1).map((run, i) => ({ run, index: i + 1 }));
  const remainingResults = await runWithConcurrency(remainingTasks, CONCURRENCY);

  const allResults = [firstResult, ...remainingResults];

  // Summary
  console.log("\n=== SUMMARY ===\n");
  let totalImported = 0;
  let totalSkipped = 0;
  let failures = 0;

  for (const r of allResults) {
    const icon = r.status === "ok" ? "OK" : r.status === "empty" ? "EMPTY" : "FAIL";
    console.log(`  [${icon}] ${r.run}`);
    if (r.status === "ok") {
      console.log(`       Imported: ${r.imported}, Dupes: ${r.skipped}`);
      totalImported += r.imported;
      totalSkipped += r.skipped;
    } else if (r.status === "error") {
      console.log(`       Error: ${r.error}`);
      failures++;
    }
  }

  console.log(`\nTotal imported: ${totalImported}`);
  console.log(`Total dupes skipped: ${totalSkipped}`);
  console.log(`Failures: ${failures}`);
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
