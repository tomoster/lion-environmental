import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JobForm } from "./job-form";
import { JobsTable } from "./jobs-table";

export default async function JobsPage() {
  const supabase = await createClient();

  const [{ data: jobs }, { data: workers }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, job_number, client_company, building_address, service_type, scan_date, dispatch_status, report_status, workers(name)")
      .order("job_number", { ascending: false }),
    supabase
      .from("workers")
      .select("id, name, active")
      .eq("active", true)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage inspection jobs and track progress
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>New Job</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
            </DialogHeader>
            <JobForm workers={workers ?? []} />
          </DialogContent>
        </Dialog>
      </div>

      <JobsTable jobs={(jobs ?? []) as Parameters<typeof JobsTable>[0]["jobs"]} />
    </div>
  );
}
