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
import { sendProposal } from "./send-proposal-action";
import { DeleteJobButton } from "./delete-job-button";
import { WorkflowBar } from "./workflow-bar";
import { JobDetailForm } from "./job-detail-form";
import { getAvailableWorkers } from "@/lib/scheduling";
import { formatServiceTypes } from "@/lib/service-type-utils";

const TAX_RATE = 0.0888;

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

  const [{ data: job }, { data: jobInvoice }, { data: jobReports }, { data: officeWorkers }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, workers!jobs_worker_id_fkey(id, name)")
      .eq("id", id)
      .single(),
    supabase
      .from("invoices")
      .select("id, status")
      .eq("job_id", id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("job_reports")
      .select("id, report_type, file_path, original_filename, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("workers")
      .select("id, name")
      .eq("role", "office")
      .eq("active", true)
      .order("name"),
  ]);

  if (!job) notFound();

  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [
      "xrf_price_per_unit", "xrf_price_per_common_space",
      "xrf_price_studios_1bed", "xrf_price_2_3bed",
      "dust_swab_wipe_rate", "dust_swab_site_visit_rate", "dust_swab_proj_mgmt_rate",
      "asbestos_sample_rate", "asbestos_site_visit_rate",
    ]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings ?? []) {
    settingsMap[s.key] = s.value;
  }

  const defaultPricePerUnit = job.price_per_unit ?? (settingsMap.xrf_price_per_unit ? Number(settingsMap.xrf_price_per_unit) : null);
  const defaultPricePerCommonSpace = job.price_per_common_space ?? (settingsMap.xrf_price_per_common_space ? Number(settingsMap.xrf_price_per_common_space) : 110);
  const defaultPriceStudios1Bed = job.xrf_price_studios_1bed ?? (settingsMap.xrf_price_studios_1bed ? Number(settingsMap.xrf_price_studios_1bed) : 150);
  const defaultPrice2_3Bed = job.xrf_price_2_3bed ?? (settingsMap.xrf_price_2_3bed ? Number(settingsMap.xrf_price_2_3bed) : 165);
  const defaultWipeRate = job.wipe_rate ?? (settingsMap.dust_swab_wipe_rate ? Number(settingsMap.dust_swab_wipe_rate) : 20);
  const defaultDustSwabSiteVisitRate = job.dust_swab_site_visit_rate ?? (settingsMap.dust_swab_site_visit_rate ? Number(settingsMap.dust_swab_site_visit_rate) : 375);
  const defaultDustSwabProjMgmtRate = job.dust_swab_proj_mgmt_rate ?? (settingsMap.dust_swab_proj_mgmt_rate ? Number(settingsMap.dust_swab_proj_mgmt_rate) : 135);
  const defaultAsbestosSampleRate = job.asbestos_sample_rate ?? (settingsMap.asbestos_sample_rate ? Number(settingsMap.asbestos_sample_rate) : null);
  const defaultAsbestosSiteVisitRate = job.asbestos_site_visit_rate ?? (settingsMap.asbestos_site_visit_rate ? Number(settingsMap.asbestos_site_visit_rate) : 375);

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
    ? (job.num_studios_1bed ?? 0) * (defaultPriceStudios1Bed ?? 0) +
      (job.num_2_3bed ?? 0) * (defaultPrice2_3Bed ?? 0) +
      (job.num_common_spaces ?? 0) * (defaultPricePerCommonSpace ?? 0)
    : 0;

  const dustSwabSubtotal = job.has_dust_swab
    ? (defaultDustSwabSiteVisitRate ?? 0) +
      (defaultDustSwabProjMgmtRate ?? 0) +
      (job.num_wipes ?? 0) * (defaultWipeRate ?? 0)
    : 0;

  const asbestosSubtotal = job.has_asbestos
    ? (defaultAsbestosSiteVisitRate ?? 0) +
      (job.num_asbestos_samples ?? 0) * (defaultAsbestosSampleRate ?? 0)
    : 0;

  const subtotal = xrfSubtotal + dustSwabSubtotal + asbestosSubtotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const workerData = job.workers as { id: string; name: string } | null;

  const updateJobWithId = updateJob.bind(null, id);
  const deleteJobWithId = deleteJob.bind(null, id);
  const dispatchJobWithId = dispatchJob.bind(null, id);
  const sendProposalWithId = sendProposal.bind(null, id);

  const uploadXrfReport = uploadReport.bind(null, id, "xrf");
  const uploadDustSwabReport = uploadReport.bind(null, id, "dust_swab");
  const uploadAsbestosReport = uploadReport.bind(null, id, "asbestos");
  const markClientPaidWithId = markClientPaid.bind(null, id);

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
        <DeleteJobButton action={deleteJobWithId} />
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {job.client_company ?? "Unnamed Job"} — Job #{job.job_number}
        </h1>
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

      <WorkflowBar
        jobId={id}
        jobStatus={job.job_status}
        hasInvoice={!!jobInvoice}
        invoiceStatus={jobInvoice?.status ?? null}
        workerName={workerData?.name ?? null}
        clientEmail={job.client_email}
        hasXrf={job.has_xrf}
        hasDustSwab={job.has_dust_swab}
        hasAsbestos={job.has_asbestos}
        xrfReportStatus={job.report_status}
        dustSwabReportStatus={job.dust_swab_status ?? "not_started"}
        dispatchAction={dispatchJobWithId}
        markPaidAction={markClientPaidWithId}
        sendProposalAction={sendProposalWithId}
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <JobDetailForm
            key={job.updated_at}
            action={updateJobWithId}
            job={job}
            defaultPricePerUnit={defaultPricePerUnit}
            defaultPricePerCommonSpace={defaultPricePerCommonSpace}
            defaultPriceStudios1Bed={defaultPriceStudios1Bed}
            defaultPrice2_3Bed={defaultPrice2_3Bed}
            defaultWipeRate={defaultWipeRate}
            defaultDustSwabSiteVisitRate={defaultDustSwabSiteVisitRate}
            defaultDustSwabProjMgmtRate={defaultDustSwabProjMgmtRate}
            defaultAsbestosSampleRate={defaultAsbestosSampleRate}
            defaultAsbestosSiteVisitRate={defaultAsbestosSiteVisitRate}
            workerData={workerData}
            availability={availability}
            officeWorkers={officeWorkers ?? []}
            xrfStatusLabels={XRF_STATUS_LABELS}
            dustSwabStatusLabels={DUST_SWAB_STATUS_LABELS}
          />

          {job.has_xrf && (() => {
            const xrfReports = (jobReports ?? []).filter((r) => r.report_type === "xrf");
            const expectedXrf = (job.num_studios_1bed ?? 0) + (job.num_2_3bed ?? 0) + (job.num_common_spaces ?? 0);
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    XRF Reports{expectedXrf > 0 ? ` (${xrfReports.length} of ${expectedXrf} uploaded)` : ` (${xrfReports.length} uploaded)`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {xrfReports.length > 0 ? (
                    <ul className="space-y-1.5">
                      {xrfReports.map((r) => (
                        <li key={r.id} className="flex items-center gap-2 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                          <a
                            href={`/api/reports/${r.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            {r.original_filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No XRF reports uploaded yet.</p>
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
            );
          })()}

          {job.has_dust_swab && (() => {
            const dsReports = (jobReports ?? []).filter((r) => r.report_type === "dust_swab");
            const expectedDs = job.num_wipes ?? 0;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Dust Swab Reports{expectedDs > 0 ? ` (${dsReports.length} of ${expectedDs} uploaded)` : ` (${dsReports.length} uploaded)`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dsReports.length > 0 ? (
                    <ul className="space-y-1.5">
                      {dsReports.map((r) => (
                        <li key={r.id} className="flex items-center gap-2 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                          <a
                            href={`/api/reports/${r.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            {r.original_filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No dust swab reports uploaded yet.</p>
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
            );
          })()}

          {job.has_asbestos && (() => {
            const asbestosReports = (jobReports ?? []).filter((r) => r.report_type === "asbestos");
            const expectedAsbestos = job.num_asbestos_samples ?? 0;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Asbestos Reports{expectedAsbestos > 0 ? ` (${asbestosReports.length} of ${expectedAsbestos} uploaded)` : ` (${asbestosReports.length} uploaded)`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {asbestosReports.length > 0 ? (
                    <ul className="space-y-1.5">
                      {asbestosReports.map((r) => (
                        <li key={r.id} className="flex items-center gap-2 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                          <a
                            href={`/api/reports/${r.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            {r.original_filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No asbestos reports uploaded yet.</p>
                  )}
                  <form action={uploadAsbestosReport}>
                    <div className="flex items-center gap-3">
                      <Input name="file" type="file" accept=".pdf,.doc,.docx" />
                      <Button type="submit" variant="outline" size="sm">
                        Upload
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            );
          })()}
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
                      <span>Studios/1-Bed</span>
                      <span>{job.num_studios_1bed ?? 0} x {formatCurrency(defaultPriceStudios1Bed ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span></span>
                      <span>{formatCurrency((job.num_studios_1bed ?? 0) * (defaultPriceStudios1Bed ?? 0))}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>2-3 Bed</span>
                      <span>{job.num_2_3bed ?? 0} x {formatCurrency(defaultPrice2_3Bed ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span></span>
                      <span>{formatCurrency((job.num_2_3bed ?? 0) * (defaultPrice2_3Bed ?? 0))}</span>
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
                    <span>{formatCurrency(defaultDustSwabSiteVisitRate ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proj mgmt</span>
                    <span>{formatCurrency(defaultDustSwabProjMgmtRate ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Wipes ({job.num_wipes ?? 0} x {formatCurrency(defaultWipeRate ?? 0)})
                    </span>
                    <span>{formatCurrency((job.num_wipes ?? 0) * (defaultWipeRate ?? 0))}</span>
                  </div>
                </>
              )}

              {job.has_asbestos && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Site visit</span>
                    <span>{formatCurrency(defaultAsbestosSiteVisitRate ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Samples ({job.num_asbestos_samples ?? 0} x {formatCurrency(defaultAsbestosSampleRate ?? 0)})
                    </span>
                    <span>{formatCurrency((job.num_asbestos_samples ?? 0) * (defaultAsbestosSampleRate ?? 0))}</span>
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
