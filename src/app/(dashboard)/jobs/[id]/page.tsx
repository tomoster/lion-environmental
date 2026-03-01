import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateJob, deleteJob, uploadReport } from "../actions";
import { dispatchJob, markClientPaid } from "./automation-actions";
import { sendProposal } from "./send-proposal-action";
import { DeleteJobButton } from "./delete-job-button";
import { WorkflowBar } from "./workflow-bar";
import { JobDetailForm } from "./job-detail-form";
import { getAvailableWorkers } from "@/lib/scheduling";

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

const ASBESTOS_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  writing: "Writing",
  uploaded: "Uploaded",
  sent: "Sent",
};

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

  const defaultPricePerCommonSpace = settingsMap.xrf_price_per_common_space ? Number(settingsMap.xrf_price_per_common_space) : 110;
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

  const expectedXrf = (job.num_studios_1bed ?? 0) + (job.num_2_3bed ?? 0) + (job.num_common_spaces ?? 0);
  const expectedDustSwab = job.num_wipes ?? 0;
  const expectedAsbestos = job.num_asbestos_samples ?? 0;

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

      <div>
        <h1 className="text-2xl font-semibold">
          {job.client_company ?? "Unnamed Job"} — Job #{job.job_number}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Created{" "}
          {job.created_at
            ? new Date(job.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "\u2014"}
        </p>
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
        asbestosReportStatus={job.asbestos_status ?? "not_started"}
        dispatchAction={dispatchJobWithId}
        markPaidAction={markClientPaidWithId}
        sendProposalAction={sendProposalWithId}
      />

      <JobDetailForm
        key={job.updated_at}
        action={updateJobWithId}
        job={job}
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
        asbestosStatusLabels={ASBESTOS_STATUS_LABELS}
        pricingSummary={{
          xrfSubtotal,
          dustSwabSubtotal,
          asbestosSubtotal,
          subtotal,
          tax,
          total,
        }}
        uploadActions={{
          xrf: uploadXrfReport,
          dustSwab: uploadDustSwabReport,
          asbestos: uploadAsbestosReport,
        }}
        jobReports={(jobReports ?? []).map((r) => ({
          id: r.id,
          report_type: r.report_type,
          file_path: r.file_path,
          original_filename: r.original_filename,
        }))}
        expectedCounts={{
          xrf: expectedXrf,
          dustSwab: expectedDustSwab,
          asbestos: expectedAsbestos,
        }}
      />
    </div>
  );
}
