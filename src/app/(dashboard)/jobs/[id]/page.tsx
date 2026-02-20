import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { updateJob, deleteJob, uploadReport } from "../actions";
import { dispatchJob, markClientPaid } from "./automation-actions";
import { DeleteJobButton } from "./delete-job-button";
import { DispatchButton, ClientPaidButton } from "./action-buttons";
import { JobDetailForm } from "./job-detail-form";
import { getAvailableWorkers } from "@/lib/scheduling";
import { formatServiceTypes } from "@/lib/service-type-utils";

const DUST_SWAB_SITE_VISIT = 375;
const DUST_SWAB_REPORT_FEE = 135;
const DUST_SWAB_WIPE_RATE = 20;
const TAX_RATE = 0.0888;

const JOB_STATUS_LABELS: Record<string, string> = {
  not_dispatched: "Not Dispatched",
  open: "Open",
  assigned: "Assigned",
  completed: "Completed",
};

const XRF_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  writing: "Writing",
  uploaded: "Uploaded",
  sent: "Sent",
};

const DUST_SWAB_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  sent_to_lab: "Sent to Lab",
  results_received: "Results Received",
  writing: "Writing",
  uploaded: "Uploaded",
  sent: "Sent",
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
    case "not_started": return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "writing": return "bg-orange-100 text-orange-700 border-orange-200";
    case "uploaded": return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "sent": return "bg-green-100 text-green-700 border-green-200";
    case "sent_to_lab": return "bg-blue-100 text-blue-700 border-blue-200";
    case "results_received": return "bg-purple-100 text-purple-700 border-purple-200";
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

  const [{ data: job }, { data: jobInvoice }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, workers(id, name)")
      .eq("id", id)
      .single(),
    supabase
      .from("invoices")
      .select("id, status")
      .eq("job_id", id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!job) notFound();

  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["xrf_price_per_unit", "xrf_price_per_common_space"]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings ?? []) {
    settingsMap[s.key] = s.value;
  }

  const defaultPricePerUnit = job.price_per_unit ?? (settingsMap.xrf_price_per_unit ? Number(settingsMap.xrf_price_per_unit) : null);
  const defaultPricePerCommonSpace = job.price_per_common_space ?? (settingsMap.xrf_price_per_common_space ? Number(settingsMap.xrf_price_per_common_space) : null);

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

  const xrfSubtotal = job.has_xrf
    ? (job.num_units ?? 0) * (defaultPricePerUnit ?? 0) +
      (job.num_common_spaces ?? 0) * (defaultPricePerCommonSpace ?? 0)
    : 0;

  const dustSwabSubtotal = job.has_dust_swab
    ? DUST_SWAB_SITE_VISIT +
      DUST_SWAB_REPORT_FEE +
      (job.num_wipes ?? 0) * DUST_SWAB_WIPE_RATE
    : 0;

  const subtotal = xrfSubtotal + dustSwabSubtotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const workerData = job.workers as { id: string; name: string } | null;

  const updateJobWithId = updateJob.bind(null, id);
  const deleteJobWithId = deleteJob.bind(null, id);
  const dispatchJobWithId = dispatchJob.bind(null, id);

  const uploadXrfReport = uploadReport.bind(null, id, "xrf");
  const uploadDustSwabReport = uploadReport.bind(null, id, "dust_swab");
  const markClientPaidWithId = markClientPaid.bind(null, id);

  const canDispatch = job.job_status === "not_dispatched";
  const canMarkPaid = jobInvoice && jobInvoice.status !== "paid";

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
            <DispatchButton action={dispatchJobWithId} />
          )}
          {canMarkPaid && (
            <ClientPaidButton action={markClientPaidWithId} />
          )}
          {!jobInvoice && (
            <Link href={`/invoices/new?job_id=${id}`}>
              <Button variant="outline">Generate Invoice</Button>
            </Link>
          )}
          <DeleteJobButton action={deleteJobWithId} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {job.client_company ?? "Unnamed Job"} — Job #{job.job_number}
        </h1>
        <Badge variant="outline" className={dispatchBadgeClass(job.job_status)}>
          {JOB_STATUS_LABELS[job.job_status] ?? job.job_status}
        </Badge>
        {job.has_xrf && (
          <Badge variant="outline" className={reportBadgeClass(job.report_status)}>
            XRF: {XRF_STATUS_LABELS[job.report_status] ?? job.report_status}
          </Badge>
        )}
        {job.has_dust_swab && (
          <Badge variant="outline" className={reportBadgeClass(job.dust_swab_status ?? "not_started")}>
            Dust Swab: {DUST_SWAB_STATUS_LABELS[job.dust_swab_status ?? "not_started"] ?? job.dust_swab_status}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <JobDetailForm
            key={job.updated_at}
            action={updateJobWithId}
            job={job}
            defaultPricePerUnit={defaultPricePerUnit}
            defaultPricePerCommonSpace={defaultPricePerCommonSpace}
            workerData={workerData}
            availability={availability}
            jobStatusLabels={JOB_STATUS_LABELS}
            xrfStatusLabels={XRF_STATUS_LABELS}
            dustSwabStatusLabels={DUST_SWAB_STATUS_LABELS}
          />

          {job.has_xrf && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">XRF Report File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.xrf_report_file_path ? (
                  <a
                    href={`/api/reports/${job.xrf_report_file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    View Report (PDF)
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">No XRF report uploaded yet.</p>
                )}
                <form action={uploadXrfReport}>
                  <div className="flex items-center gap-3">
                    <Input name="file" type="file" accept=".pdf,.doc,.docx" />
                    <Button type="submit" variant="outline" size="sm">
                      Upload
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {job.has_dust_swab && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dust Swab Report File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.dust_swab_report_file_path ? (
                  <a
                    href={`/api/reports/${job.dust_swab_report_file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    View Report (PDF)
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">No dust swab report uploaded yet.</p>
                )}
                <form action={uploadDustSwabReport}>
                  <div className="flex items-center gap-3">
                    <Input name="file" type="file" accept=".pdf,.doc,.docx" />
                    <Button type="submit" variant="outline" size="sm">
                      Upload
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {job.has_xrf && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Units</span>
                      <span>{job.num_units ?? 0} x {formatCurrency(defaultPricePerUnit ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span></span>
                      <span>{formatCurrency((job.num_units ?? 0) * (defaultPricePerUnit ?? 0))}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Common spaces</span>
                      <span>{job.num_common_spaces ?? 0} x {formatCurrency(defaultPricePerCommonSpace ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span></span>
                      <span>{formatCurrency((job.num_common_spaces ?? 0) * (defaultPricePerCommonSpace ?? 0))}</span>
                    </div>
                  </div>
                </>
              )}

              {job.has_dust_swab && (
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
                <span>{formatServiceTypes(job)}</span>
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
