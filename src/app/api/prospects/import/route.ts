import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/require-auth";
import { nextBusinessDaySend } from "@/lib/email/scheduling";
import {
  normalizePhone,
  normalizeCompany,
  fetchDedupSets,
  batchInsert,
} from "@/lib/prospects/import";

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

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { rows } = (await request.json()) as { rows: ApifyRow[] };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  let dedup;
  try {
    dedup = await fetchDedupSets(supabase);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }

  const seenInBatch = new Set<string>();
  const toInsert: Record<string, unknown>[] = [];
  const duplicates: string[] = [];

  for (const row of rows) {
    const company = row.title?.trim();
    if (!company) continue;

    const normalized = normalizeCompany(company);
    const phone = normalizePhone(row.phone);
    const email = row.email?.trim().toLowerCase() || null;

    const isDuplicate =
      dedup.names.has(normalized) ||
      seenInBatch.has(normalized) ||
      (!!phone && dedup.phones.has(phone)) ||
      (!!email && dedup.emails.has(email));

    if (isDuplicate) {
      duplicates.push(company);
      continue;
    }

    seenInBatch.add(normalized);
    if (phone) dedup.phones.add(phone);
    if (email) dedup.emails.add(email);

    const hasEmail = !!email;
    toInsert.push({
      company,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      building_address: row.address?.trim() || null,
      website: row.website?.trim() || null,
      google_rating: row.totalScore ?? null,
      status: hasEmail ? "emailing" : "new",
      source: "apify",
      seq_step: hasEmail ? 1 : 0,
      next_send: hasEmail ? nextBusinessDaySend() : null,
    });
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped: duplicates.length, duplicates });
  }

  const result = await batchInsert(supabase, toInsert);

  if (result.error) {
    return NextResponse.json(
      { error: result.error, imported: result.imported, skipped: duplicates.length, duplicates },
      { status: 500 }
    );
  }

  return NextResponse.json({
    imported: result.imported,
    skipped: duplicates.length,
    duplicates,
  });
}
