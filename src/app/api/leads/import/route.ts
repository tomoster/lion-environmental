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

interface LeadInput {
  name: string;
  email: string | null;
  phone?: string | null;
  company: string;
  job_title?: string | null;
  linkedin?: string | null;
  apollo_id?: string | null;
  source: string;
  location?: string | null;
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

  let dedup;
  try {
    dedup = await fetchDedupSets(supabase);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }

  const seenEmails = new Set<string>();
  const seenApolloIds = new Set<string>();
  const seenCompanies = new Set<string>();
  const toInsert: Record<string, unknown>[] = [];
  const duplicates: string[] = [];

  for (const lead of leads) {
    if (!lead.company?.trim()) continue;

    const normalized = normalizeCompany(lead.company);
    const phone = normalizePhone(lead.phone);
    const email = lead.email?.trim().toLowerCase() || null;
    const apolloId = lead.apollo_id || null;
    const hasPersonId = !!email || !!apolloId;

    const isDuplicate =
      (!!apolloId && (dedup.apolloIds.has(apolloId) || seenApolloIds.has(apolloId))) ||
      (!!email && (dedup.emails.has(email) || seenEmails.has(email))) ||
      (!!phone && dedup.phones.has(phone)) ||
      (!hasPersonId && (dedup.names.has(normalized) || seenCompanies.has(normalized)));

    if (isDuplicate) {
      duplicates.push(lead.company);
      continue;
    }

    if (apolloId) seenApolloIds.add(apolloId);
    if (email) seenEmails.add(email);
    if (!hasPersonId) seenCompanies.add(normalized);

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
      building_address: lead.location?.trim() || null,
      status: hasEmail ? "emailing" : "new",
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

  const result = await batchInsert(supabase, toInsert);

  if (result.error) {
    return NextResponse.json(
      { error: result.error, imported: result.imported, duplicates: duplicates.length },
      { status: 500 }
    );
  }

  return NextResponse.json({
    imported: result.imported,
    duplicates: duplicates.length,
    total: leads.length,
  });
}
