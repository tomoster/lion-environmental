import { createClient } from "@/lib/supabase/server";
import { ProspectsTable } from "./prospects-table";

interface ProspectsPageProps {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export default async function ProspectsPage({
  searchParams,
}: ProspectsPageProps) {
  const { search, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `company.ilike.%${search}%,contact_name.ilike.%${search}%`
    );
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: prospects, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Prospects</h1>
        <p className="text-destructive mt-4 text-sm">
          Failed to load prospects: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Prospects</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your leads and sales pipeline.
        </p>
      </div>

      <ProspectsTable
        prospects={prospects ?? []}
        search={search ?? ""}
        statusFilter={status ?? ""}
      />
    </div>
  );
}
