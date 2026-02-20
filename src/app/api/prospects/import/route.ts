import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ApifyRow {
  title?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  totalScore?: number;
  placeId?: string;
  categoryName?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  duplicates: string[];
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/[^\d+]/g, "");
}

function normalizeCompany(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { rows } = (await request.json()) as { rows: ApifyRow[] };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("prospects")
    .select("company, phone, email");

  if (fetchError) {
    return NextResponse.json(
      { error: `Failed to fetch existing prospects: ${fetchError.message}` },
      { status: 500 }
    );
  }

  const existingNormalizedNames = new Set(
    (existing ?? []).map((p) => normalizeCompany(p.company))
  );
  const existingPhones = new Set(
    (existing ?? [])
      .map((p) => normalizePhone(p.phone))
      .filter(Boolean)
  );
  const existingEmails = new Set(
    (existing ?? [])
      .map((p) => p.email?.toLowerCase())
      .filter(Boolean)
  );

  const seenInBatch = new Set<string>();
  const toInsert: Array<{
    company: string;
    phone: string | null;
    email: string | null;
    building_address: string | null;
    website: string | null;
    google_rating: number | null;
    status: string;
    source: string;
  }> = [];
  const duplicates: string[] = [];

  for (const row of rows) {
    const company = row.title?.trim();
    if (!company) continue;

    const normalized = normalizeCompany(company);
    const phone = normalizePhone(row.phone);
    const email = row.email?.trim().toLowerCase() || null;

    let isDuplicate = false;

    if (existingNormalizedNames.has(normalized) || seenInBatch.has(normalized)) {
      isDuplicate = true;
    } else if (phone && existingPhones.has(phone)) {
      isDuplicate = true;
    } else if (email && existingEmails.has(email)) {
      isDuplicate = true;
    }

    if (isDuplicate) {
      duplicates.push(company);
      continue;
    }

    seenInBatch.add(normalized);
    if (phone) existingPhones.add(phone);
    if (email) existingEmails.add(email);

    toInsert.push({
      company,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      building_address: row.address?.trim() || null,
      website: row.website?.trim() || null,
      google_rating: row.totalScore ?? null,
      status: "new",
      source: "apify",
    });
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: duplicates.length,
      duplicates,
    } satisfies ImportResult);
  }

  const BATCH_SIZE = 500;
  let totalImported = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from("prospects")
      .insert(batch);

    if (insertError) {
      return NextResponse.json(
        {
          error: `Insert failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`,
          imported: totalImported,
          skipped: duplicates.length,
          duplicates,
        },
        { status: 500 }
      );
    }
    totalImported += batch.length;
  }

  return NextResponse.json({
    imported: totalImported,
    skipped: duplicates.length,
    duplicates,
  } satisfies ImportResult);
}
