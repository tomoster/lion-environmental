import { createClient } from "@/lib/supabase/server";
import { ProspectsTable } from "./prospects-table";

const PAGE_SIZE = 50;

interface ProspectsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ProspectsPage({
  searchParams,
}: ProspectsPageProps) {
  const { search, status, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("prospects")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `company.ilike.%${search}%,contact_name.ilike.%${search}%`
    );
  }

  if (status === "archived") {
    query = query.eq("status", "archived");
  } else if (status && status !== "all") {
    query = query.eq("status", status);
  } else {
    query = query.neq("status", "archived");
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const [{ data: prospects, count, error }, { count: emailsSentToday }] =
    await Promise.all([
      query,
      supabase
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("created_at", todayStart.toISOString()),
    ]);

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
          {(emailsSentToday ?? 0) > 0 && (
            <span className="ml-2 text-xs">
              · {emailsSentToday} email{emailsSentToday === 1 ? "" : "s"} sent
              today
            </span>
          )}
        </p>
      </div>

      <ProspectsTable
        prospects={prospects ?? []}
        search={search ?? ""}
        statusFilter={status ?? ""}
        page={page}
        totalCount={count ?? 0}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
