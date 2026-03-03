import { SupabaseClient } from "@supabase/supabase-js";

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/[^\d+]/g, "");
}

export function normalizeCompany(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
}

export interface DedupSets {
  names: Set<string>;
  phones: Set<string>;
  emails: Set<string>;
  apolloIds: Set<string>;
}

export async function fetchDedupSets(
  supabase: SupabaseClient
): Promise<DedupSets> {
  const { data: existing, error } = await supabase
    .from("prospects")
    .select("company, phone, email, apollo_id");

  if (error) throw new Error(`Failed to fetch existing prospects: ${error.message}`);

  const rows = existing ?? [];
  return {
    names: new Set(rows.map((p) => normalizeCompany(p.company))),
    phones: new Set(
      rows.map((p) => normalizePhone(p.phone)).filter(Boolean) as string[]
    ),
    emails: new Set(
      rows.map((p) => p.email?.toLowerCase()).filter(Boolean) as string[]
    ),
    apolloIds: new Set(
      rows
        .map((p) => (p as Record<string, unknown>).apollo_id as string | null)
        .filter(Boolean) as string[]
    ),
  };
}

export async function batchInsert(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<{ imported: number; error?: string }> {
  const BATCH_SIZE = 500;
  let totalImported = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("prospects").insert(batch);

    if (error) {
      return {
        imported: totalImported,
        error: `Insert failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`,
      };
    }
    totalImported += batch.length;
  }

  return { imported: totalImported };
}
