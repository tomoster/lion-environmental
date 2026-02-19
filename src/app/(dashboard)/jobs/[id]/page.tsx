import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateJob, deleteJob, uploadReport } from "../actions";
import { dispatchJob, sendReport } from "./automation-actions";
import { getAvailableWorkers } from "@/lib/scheduling";

const DUST_SWAB_SITE_VISIT = 375;
const DUST_SWAB_REPORT_FEE = 135;
const DUST_SWAB_WIPE_RATE = 20;
const TAX_RATE = 0.0888;

const DISPATCH_STATUS_LABELS: Record<string, string> = {
  not_dispatched: "Not Dispatched",
  open: "Open",
  assigned: "Assigned",
  completed: "Completed",
};

const REPORT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  field_work_done: "Field Work Done",
  lab_results_pending: "Lab Results Pending",
  writing_report: "Writing Report",
  report_sent: "Report Sent",
  complete: "Complete",
};

function dispatchBadgeClass(status: string): string {
  switch (status) {
    case "not_dispatched": return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "open": return "bg-blue-100 text-blue-700 border-blue-200";
    case "assigned": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "completed": return "bg-green-100 text-green-700 border-green-200";
    default: return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

function reportBadgeClass(status: string): string {
  switch (status) {
    case "scheduled": return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "in_progress": return "bg-blue-100 text-blue-700 border-blue-200";
    case "field_work_done": return "bg-purple-100 text-purple-700 border-purple-200";
    case "lab_results_pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "writing_report": return "bg-orange-100 text-orange-700 border-orange-200";
    case "report_sent": return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "complete": return "bg-green-100 text-green-700 border-green-200";
    default: return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

function formatDate(date: string | null): string {
  if (!date) return "\u2014";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime12h(time: string | null): string {
  if (!time) return "\u2014";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")}${period}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, workers(id, name)")
    .eq("id", id)
    .single();

  if (!job) notFound();

  let availability = { available: [] as { id: string; name: string }[], unavailable: [] as { worker: { id: string; name: string }; reason: string }[] };

  if (job.scan_date) {
    availability = await getAvailableWorkers(
      job.scan_date,
      job.start_time,
      job.estimated_end_time,
      id
    );
  } else {
    const { data: workers } = await supabase
      .from("workers")
      .select("id, name")
      .eq("active", true)
      .order("name");
    availability = { available: workers ?? [], unavailable: [] };
  }

  const lptSubtotal =
    job.service_type === "lpt"
      ? (job.num_units ?? 0) * (job.price_per_unit ?? 0) +
        (job.num_common_spaces ?? 0) * (job.price_per_common_space ?? 0)
      : null;

  const dustSwabSubtotal =
    job.service_type === "dust_swab"
      ? DUST_SWAB_SITE_VISIT +
        DUST_SWAB_REPORT_FEE +
        (job.num_wipes ?? 0) * DUST_SWAB_WIPE_RATE
      : null;

  const subtotal = lptSubtotal ?? dustSwabSubtotal ?? 0;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const workerData = job.workers as { id: string; name: string } | null;

  const updateJobWithId = updateJob.bind(null, id);
  const deleteJobWithId = deleteJob.bind(null, id);
  const uploadReportWithId = uploadReport.bind(null, id);
  const dispatchJobWithId = dispatchJob.bind(null, id);
  const sendReportWithId = sendReport.bind(null, id);

  const canDispatch = job.dispatch_status === "not_dispatched";
  const canSendReport = job.report_file_path && job.report_status !== "report_sent" && job.report_status !== "complete";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Jobs
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">Job #{job.job_number}</span>
        </div>
        <div className="flex items-center gap-2">
          {canDispatch && (
            <form action={dispatchJobWithId}>
              <Button type="submit" variant="outline">
                Dispatch to Workers
              </Button>
            </form>
          )}
          {canSendReport && (
            <form action={sendReportWithId}>
              <Button type="submit" variant="outline">
                Send Report to Client
              </Button>
            </form>
          )}
          <Link href={`/invoices/new?job_id=${id}`}>
            <Button variant="outline">Generate Invoice</Button>
          </Link>
          <form action={deleteJobWithId}>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
            >
              Delete Job
            </Button>
          </form>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {job.client_company ?? "Unnamed Job"} — Job #{job.job_number}
        </h1>
        <Badge variant="outline" className={dispatchBadgeClass(job.dispatch_status)}>
          {DISPATCH_STATUS_LABELS[job.dispatch_status] ?? job.dispatch_status}
        </Badge>
        <Badge variant="outline" className={reportBadgeClass(job.report_status)}>
          {REPORT_STATUS_LABELS[job.report_status] ?? job.report_status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <form action={updateJobWithId} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="client_company">Company</Label>
                    <Input
                      id="client_company"
                      name="client_company"
                      defaultValue={job.client_company ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="client_email">Email</Label>
                    <Input
                      id="client_email"
                      name="client_email"
                      type="email"
                      defaultValue={job.client_email ?? ""}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="building_address">Building Address</Label>
                  <Input
                    id="building_address"
                    name="building_address"
                    defaultValue={job.building_address ?? ""}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="scan_date">Scan Date</Label>
                    <Input
                      id="scan_date"
                      name="scan_date"
                      type="date"
                      defaultValue={job.scan_date ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Service Type</Label>
                    <Input
                      value={
                        job.service_type === "lpt"
                          ? "LPT"
                          : job.service_type === "dust_swab"
                          ? "Dust Swab"
                          : job.service_type ?? "\u2014"
                      }
                      readOnly
                      className="bg-muted/40 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      name="start_time"
                      type="time"
                      defaultValue={job.start_time ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="estimated_end_time">Est. End Time</Label>
                    <Input
                      id="estimated_end_time"
                      name="estimated_end_time"
                      type="time"
                      defaultValue={job.estimated_end_time ?? ""}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="worker_id">Assigned Worker</Label>
                    <Select
                      name="worker_id"
                      defaultValue={workerData?.id ?? ""}
                    >
                      <SelectTrigger id="worker_id" className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {availability.available.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                        {availability.unavailable.map(({ worker: w, reason }) => (
                          <SelectItem key={w.id} value={w.id} disabled>
                            {w.name} — {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dispatch_status">Dispatch Status</Label>
                    <Select
                      name="dispatch_status"
                      defaultValue={job.dispatch_status}
                    >
                      <SelectTrigger id="dispatch_status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DISPATCH_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="report_status">Report Status</Label>
                  <Select name="report_status" defaultValue={job.report_status}>
                    <SelectTrigger id="report_status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    defaultValue={job.notes ?? ""}
                    placeholder="Add notes..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit">Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </form>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.report_file_path ? (
                <p className="text-sm text-muted-foreground font-mono">
                  {job.report_file_path}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No report uploaded yet.</p>
              )}
              <form action={uploadReportWithId}>
                <div className="flex items-center gap-3">
                  <Input name="file" type="file" accept=".pdf,.doc,.docx" />
                  <Button type="submit" variant="outline" size="sm">
                    Upload
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {job.service_type === "lpt" && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Units</span>
                      <span>{job.num_units ?? 0} x {formatCurrency(job.price_per_unit ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span></span>
                      <span>{formatCurrency((job.num_units ?? 0) * (job.price_per_unit ?? 0))}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Common spaces</span>
                      <span>{job.num_common_spaces ?? 0} x {formatCurrency(job.price_per_common_space ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span></span>
                      <span>{formatCurrency((job.num_common_spaces ?? 0) * (job.price_per_common_space ?? 0))}</span>
                    </div>
                  </div>
                </>
              )}

              {job.service_type === "dust_swab" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Site visit</span>
                    <span>{formatCurrency(DUST_SWAB_SITE_VISIT)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Report</span>
                    <span>{formatCurrency(DUST_SWAB_REPORT_FEE)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Wipes ({job.num_wipes ?? 0} x {formatCurrency(DUST_SWAB_WIPE_RATE)})
                    </span>
                    <span>{formatCurrency((job.num_wipes ?? 0) * DUST_SWAB_WIPE_RATE)}</span>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (8.88%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job number</span>
                <span className="font-mono font-medium">#{job.job_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span>
                  {job.service_type === "lpt"
                    ? "LPT"
                    : job.service_type === "dust_swab"
                    ? "Dust Swab"
                    : "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scan date</span>
                <span>{formatDate(job.scan_date)}</span>
              </div>
              {job.start_time && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>
                    {formatTime12h(job.start_time)}
                    {job.estimated_end_time ? ` \u2013 ${formatTime12h(job.estimated_end_time)}` : ""}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Worker</span>
                <span>{workerData?.name ?? "Unassigned"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {job.created_at
                    ? new Date(job.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "\u2014"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
