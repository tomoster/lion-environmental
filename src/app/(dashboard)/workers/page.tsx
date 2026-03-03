import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { WorkerForm } from "./worker-form";
import { WorkersTable } from "./workers-table";

export default async function WorkersPage() {
  const supabase = await createClient();

  const { data: workers } = await supabase
    .from("workers")
    .select("id, name, phone, email, active, role, rate_per_unit, rate_per_common_space")
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

  const workersWithCounts = workerList.map((w) => ({
    ...w,
    jobsDone: jobCountMap[w.id] ?? 0,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage field inspectors and track payments
          </p>
        </div>
        <WorkerForm
          mode="create"
          trigger={<Button>Add Worker</Button>}
        />
      </div>
      <div className="rounded-lg border">
        <WorkersTable workers={workersWithCounts} />
      </div>
    </div>
  );
}
