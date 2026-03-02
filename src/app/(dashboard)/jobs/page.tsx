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

  const [{ data: jobs }, { data: properties }, { data: workers }, { data: settings }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, job_number, client_company, job_status")
      .order("job_number", { ascending: false }),
    supabase
      .from("properties")
      .select("job_id, has_xrf, has_dust_swab, has_asbestos"),
    supabase
      .from("workers")
      .select("id, name, active")
      .eq("active", true)
      .eq("role", "field")
      .order("name"),
    supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "xrf_duration_per_unit", "xrf_duration_per_common_space", "dust_swab_duration", "asbestos_duration",
      ]),
  ]);

  const propsByJob = new Map<string, { count: number; has_xrf: boolean; has_dust_swab: boolean; has_asbestos: boolean }>();
  for (const p of properties ?? []) {
    const existing = propsByJob.get(p.job_id) ?? { count: 0, has_xrf: false, has_dust_swab: false, has_asbestos: false };
    existing.count++;
    if (p.has_xrf) existing.has_xrf = true;
    if (p.has_dust_swab) existing.has_dust_swab = true;
    if (p.has_asbestos) existing.has_asbestos = true;
    propsByJob.set(p.job_id, existing);
  }

  const jobsWithProperties = (jobs ?? []).map((job) => {
    const agg = propsByJob.get(job.id) ?? { count: 0, has_xrf: false, has_dust_swab: false, has_asbestos: false };
    const types: string[] = [];
    if (agg.has_xrf) types.push("XRF");
    if (agg.has_dust_swab) types.push("Dust Swab");
    if (agg.has_asbestos) types.push("Asbestos");
    return {
      ...job,
      property_count: agg.count,
      service_types: types.join(" + "),
    };
  });

  const s = Object.fromEntries((settings ?? []).map((r) => [r.key, r.value]));
  const durationDefaults = {
    xrf_duration_per_unit: parseInt(s.xrf_duration_per_unit ?? "45"),
    xrf_duration_per_common_space: parseInt(s.xrf_duration_per_common_space ?? "30"),
    dust_swab_duration: parseInt(s.dust_swab_duration ?? "90"),
    asbestos_duration: parseInt(s.asbestos_duration ?? "60"),
  };

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
            <JobForm
              workers={workers ?? []}
              durationDefaults={durationDefaults}
            />
          </DialogContent>
        </Dialog>
      </div>

      <JobsTable jobs={jobsWithProperties} />
    </div>
  );
}
