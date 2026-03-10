/**
 * One-time script: import Apollo enriched phone contacts into the CRM.
 *
 * Prerequisites:
 *   Run this SQL in Supabase dashboard first:
 *   ALTER TABLE prospects ADD COLUMN IF NOT EXISTS phone_enriched boolean DEFAULT false;
 *
 * Usage:
 *   npx tsx scripts/import-apollo-phones.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CSV_FILES = [
  path.join(process.env.HOME!, "Downloads", "apollo-contacts-export.csv"),
  path.join(process.env.HOME!, "Downloads", "apollo-contacts-export (1).csv"),
];

function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? cleaned : null;
}

function normalizeCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

async function parseCsv(filePath: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });

  let headers: string[] = [];
  let isFirst = true;

  for await (const line of rl) {
    if (isFirst) {
      headers = parseCsvLine(line);
      isFirst = false;
      continue;
    }
    if (!line.trim()) continue;
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function pickPhone(row: Record<string, string>): string | null {
  // Personal/enriched numbers first, then work direct
  const mobile = normalizePhone(row["Mobile Phone"]);
  if (mobile) return mobile;
  const workDirect = normalizePhone(row["Work Direct Phone"]);
  if (workDirect) return workDirect;
  return null;
}

async function main() {
  // Verify phone_enriched column exists
  const { error: colCheck } = await supabase
    .from("prospects")
    .select("phone_enriched")
    .limit(1);

  if (colCheck) {
    console.error(
      "\nERROR: phone_enriched column not found. Run this in Supabase SQL editor first:\n\n" +
      "  ALTER TABLE prospects ADD COLUMN IF NOT EXISTS phone_enriched boolean DEFAULT false;\n"
    );
    process.exit(1);
  }

  // Load all existing prospects for dedup matching
  const { data: existing, error: fetchErr } = await supabase
    .from("prospects")
    .select("id, apollo_id, email, company");

  if (fetchErr) {
    console.error("Failed to fetch existing prospects:", fetchErr.message);
    process.exit(1);
  }

  const byApolloId = new Map<string, string>(); // apollo_id -> prospect id
  const byEmail = new Map<string, string>();     // email -> prospect id
  const byCompany = new Map<string, string>();   // normalized company -> prospect id

  for (const p of existing ?? []) {
    if (p.apollo_id) byApolloId.set(p.apollo_id, p.id);
    if (p.email) byEmail.set(p.email.toLowerCase(), p.id);
    byCompany.set(normalizeCompany(p.company), p.id);
  }

  // Parse all CSVs
  const allRows: Record<string, string>[] = [];
  for (const csvPath of CSV_FILES) {
    if (!fs.existsSync(csvPath)) {
      console.warn(`File not found, skipping: ${csvPath}`);
      continue;
    }
    const rows = await parseCsv(csvPath);
    console.log(`Loaded ${rows.length} rows from ${path.basename(csvPath)}`);
    allRows.push(...rows);
  }

  console.log(`\nTotal contacts to process: ${allRows.length}`);

  let updated = 0;
  let inserted = 0;
  let skipped = 0;

  for (const row of allRows) {
    const phone = pickPhone(row);
    const apolloId = row["Apollo Contact Id"]?.trim() || null;
    const email = row["Email"]?.trim().toLowerCase() || null;
    const company = row["Company Name"]?.trim();
    const firstName = row["First Name"]?.trim() || "";
    const lastName = row["Last Name"]?.trim() || "";
    const contactName = [firstName, lastName].filter(Boolean).join(" ") || null;
    const jobTitle = row["Title"]?.trim() || null;
    const linkedin = row["Person Linkedin Url"]?.trim() || null;
    const website = row["Website"]?.trim() || null;
    const city = row["City"]?.trim() || "";
    const state = row["State"]?.trim() || "";
    const location = [city, state].filter(Boolean).join(", ") || null;

    if (!company) {
      skipped++;
      continue;
    }

    // Find existing record
    let existingId: string | undefined;
    if (apolloId) existingId = byApolloId.get(apolloId);
    if (!existingId && email) existingId = byEmail.get(email);
    if (!existingId) existingId = byCompany.get(normalizeCompany(company));

    if (existingId) {
      // Update existing prospect with enriched phone
      const updateData: Record<string, unknown> = { phone_enriched: true };
      if (phone) updateData.phone = phone;
      if (apolloId && !byApolloId.has(apolloId)) updateData.apollo_id = apolloId;

      const { error } = await supabase
        .from("prospects")
        .update(updateData)
        .eq("id", existingId);

      if (error) {
        console.error(`Failed to update ${company}:`, error.message);
      } else {
        updated++;
      }
    } else {
      // Insert new prospect
      const insertData: Record<string, unknown> = {
        company,
        contact_name: contactName,
        email: email || null,
        phone: phone || null,
        phone_enriched: true,
        job_title: jobTitle,
        linkedin,
        apollo_id: apolloId,
        source: "apollo",
        building_address: location,
        website: website || null,
        status: "new",
        seq_step: 0,
      };

      const { error } = await supabase.from("prospects").insert(insertData);

      if (error) {
        console.error(`Failed to insert ${company}:`, error.message);
        skipped++;
      } else {
        inserted++;
        if (apolloId) byApolloId.set(apolloId, "new");
        if (email) byEmail.set(email, "new");
        byCompany.set(normalizeCompany(company), "new");
      }
    }
  }

  console.log(`\nDone!`);
  console.log(`  Updated existing:  ${updated}`);
  console.log(`  Inserted new:      ${inserted}`);
  console.log(`  Skipped (errors):  ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
