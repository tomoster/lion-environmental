import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/require-auth";

interface LeadInput {
  name: string;
  email: string | null;
  phone?: string | null;
  company: string;
  job_title?: string | null;
  linkedin?: string | null;
  apollo_id?: string | null;
  source: string;
  lead_type: string;
  location?: string | null;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/[^\d+]/g, "");
}

function normalizeCompany(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
}

function nextBusinessDaySend(): string {
  const now = new Date();
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  next.setUTCHours(14, Math.floor(Math.random() * 60), 0, 0);
  const day = next.getUTCDay();
  if (day === 6) next.setDate(next.getDate() + 2);
  if (day === 0) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { leads } = (await request.json()) as { leads: LeadInput[] };

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
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

  const existingNames = new Set(
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
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    linkedin: string | null;
    apollo_id: string | null;
    source: string;
    lead_type: string;
    building_address: string | null;
    status: string;
    seq_status: string;
    seq_step: number;
    next_send: string | null;
  }> = [];
  const duplicates: string[] = [];

  for (const lead of leads) {
    if (!lead.company?.trim()) continue;

    const normalized = normalizeCompany(lead.company);
    const phone = normalizePhone(lead.phone);
    const email = lead.email?.trim().toLowerCase() || null;

    let isDuplicate = false;
    if (existingNames.has(normalized) || seenInBatch.has(normalized)) {
      isDuplicate = true;
    } else if (phone && existingPhones.has(phone)) {
      isDuplicate = true;
    } else if (email && existingEmails.has(email)) {
      isDuplicate = true;
    }

    if (isDuplicate) {
      duplicates.push(lead.company);
      continue;
    }

    seenInBatch.add(normalized);
    if (phone) existingPhones.add(phone);
    if (email) existingEmails.add(email);

    const hasEmail = !!email;
    toInsert.push({
      company: lead.company.trim(),
      contact_name: lead.name?.trim() || null,
      email: lead.email?.trim() || null,
      phone: lead.phone?.trim() || null,
      job_title: lead.job_title?.trim() || null,
      linkedin: lead.linkedin?.trim() || null,
      apollo_id: lead.apollo_id || null,
      source: lead.source,
      lead_type: lead.lead_type,
      building_address: lead.location?.trim() || null,
      status: "new",
      seq_status: hasEmail ? "active" : "not_started",
      seq_step: hasEmail ? 1 : 0,
      next_send: hasEmail ? nextBusinessDaySend() : null,
    });
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      imported: 0,
      duplicates: duplicates.length,
      total: leads.length,
    });
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
          error: `Insert failed: ${insertError.message}`,
          imported: totalImported,
          duplicates: duplicates.length,
        },
        { status: 500 }
      );
    }
    totalImported += batch.length;
  }

  return NextResponse.json({
    imported: totalImported,
    duplicates: duplicates.length,
    total: leads.length,
  });
}
