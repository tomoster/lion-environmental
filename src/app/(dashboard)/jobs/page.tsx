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

  const [{ data: jobs }, { data: workers }, { data: settings }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, job_number, client_company, building_address, service_type, scan_date, dispatch_status, report_status, workers(name)")
      .order("job_number", { ascending: false }),
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
        "lpt_price_per_unit", "lpt_price_per_common_space",
        "dust_swab_site_visit", "dust_swab_report", "dust_swab_wipe_rate",
        "lpt_duration_per_unit", "lpt_duration_per_common_space", "dust_swab_duration",
      ]),
  ]);

  const s = Object.fromEntries((settings ?? []).map((r) => [r.key, r.value]));
  const pricingDefaults = {
    lpt_price_per_unit: parseFloat(s.lpt_price_per_unit ?? "0"),
    lpt_price_per_common_space: parseFloat(s.lpt_price_per_common_space ?? "0"),
    dust_swab_site_visit: parseFloat(s.dust_swab_site_visit ?? "375"),
    dust_swab_report: parseFloat(s.dust_swab_report ?? "135"),
    dust_swab_wipe_rate: parseFloat(s.dust_swab_wipe_rate ?? "20"),
  };
  const durationDefaults = {
    lpt_duration_per_unit: parseInt(s.lpt_duration_per_unit ?? "45"),
    lpt_duration_per_common_space: parseInt(s.lpt_duration_per_common_space ?? "30"),
    dust_swab_duration: parseInt(s.dust_swab_duration ?? "90"),
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
              pricingDefaults={pricingDefaults}
              durationDefaults={durationDefaults}
            />
          </DialogContent>
        </Dialog>
      </div>

      <JobsTable jobs={(jobs ?? []) as Parameters<typeof JobsTable>[0]["jobs"]} />
    </div>
  );
}
