import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { MemberForm } from "./member-form";
import { TeamTable } from "./team-table";

export default async function TeamPage() {
  const supabase = await createClient();

  const { data: workers } = await supabase
    .from("workers")
    .select("id, name, phone, email, zelle, active, rate_per_unit, rate_per_common_space, role, telegram_chat_id, has_xrf, has_dust_swab, has_asbestos")
    .order("name");

  const workerList = workers ?? [];

  const jobCountResults = await Promise.all(
    workerList.map(async (worker) => {
      const { count } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("worker_id", worker.id)
        .eq("dispatch_status", "completed");
      return { id: worker.id, count: count ?? 0 };
    })
  );

  const jobCountMap = Object.fromEntries(
    jobCountResults.map((r) => [r.id, r.count])
  );

  const membersWithCounts = workerList.map((w) => ({
    ...w,
    jobsDone: jobCountMap[w.id] ?? 0,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage team members, payments, and availability
          </p>
        </div>
        <MemberForm
          mode="create"
          trigger={<Button>Add Member</Button>}
        />
      </div>
      <TeamTable members={membersWithCounts} />
    </div>
  );
}
