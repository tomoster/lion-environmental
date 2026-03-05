import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateJob, updateProperty, createProperty, deleteProperty, deleteJob, uploadReport } from "../actions";
import { dispatchJob, markClientPaid } from "./automation-actions";
import { sendProposal } from "./send-proposal-action";
import { uploadSignedProposal, deleteDocument } from "./document-actions";
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

function computePropertyPricing(
  prop: {
    has_xrf: boolean;
    has_dust_swab: boolean;
    has_asbestos: boolean;
    num_studios_1bed: number | null;
    num_2_3bed: number | null;
    num_common_spaces: number | null;
    xrf_price_studios_1bed: number | null;
    xrf_price_2_3bed: number | null;
    xrf_price_per_common_space: number | null;
    num_wipes: number | null;
    wipe_rate: number | null;
    dust_swab_site_visit_rate: number | null;
    dust_swab_proj_mgmt_rate: number | null;
    num_asbestos_samples: number | null;
    asbestos_sample_rate: number | null;
    asbestos_site_visit_rate: number | null;
  },
  defaults: {
    priceStudios1Bed: number | null;
    price2_3Bed: number | null;
    pricePerCommonSpace: number | null;
    wipeRate: number | null;
    dustSwabSiteVisitRate: number | null;
    dustSwabProjMgmtRate: number | null;
    asbestosSampleRate: number | null;
    asbestosSiteVisitRate: number | null;
  }
) {
  const ps1b = prop.xrf_price_studios_1bed ?? defaults.priceStudios1Bed ?? 150;
  const p23b = prop.xrf_price_2_3bed ?? defaults.price2_3Bed ?? 165;
  const pcs = prop.xrf_price_per_common_space ?? defaults.pricePerCommonSpace ?? 110;
  const wr = prop.wipe_rate ?? defaults.wipeRate ?? 20;
  const dsvr = prop.dust_swab_site_visit_rate ?? defaults.dustSwabSiteVisitRate ?? 375;
  const dpmr = prop.dust_swab_proj_mgmt_rate ?? defaults.dustSwabProjMgmtRate ?? 135;
  const asr = prop.asbestos_sample_rate ?? defaults.asbestosSampleRate ?? 0;
  const asvr = prop.asbestos_site_visit_rate ?? defaults.asbestosSiteVisitRate ?? 375;

  const xrfSubtotal = prop.has_xrf
    ? (prop.num_studios_1bed ?? 0) * ps1b +
      (prop.num_2_3bed ?? 0) * p23b +
      (prop.num_common_spaces ?? 0) * pcs
    : 0;

  const dustSwabSubtotal = prop.has_dust_swab
    ? dsvr + dpmr + (prop.num_wipes ?? 0) * wr
    : 0;

  const asbestosSubtotal = prop.has_asbestos
    ? asvr + (prop.num_asbestos_samples ?? 0) * asr
    : 0;

  const subtotal = xrfSubtotal + dustSwabSubtotal + asbestosSubtotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return { xrfSubtotal, dustSwabSubtotal, asbestosSubtotal, subtotal, tax, total };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: job }, { data: properties }, { data: jobInvoice }, { data: jobReports }, { data: officeWorkers }, { data: jobDocuments }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("properties")
      .select("*, worker:workers!properties_worker_id_fkey(id, name), report_writer:workers!properties_report_writer_id_fkey(id, name)")
      .eq("job_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select("id, status, pdf_path, invoice_number, total")
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
    supabase
      .from("job_documents")
      .select("id, property_id, document_type, file_path, original_filename, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!job) notFound();

  const props = properties ?? [];

  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [
      "xrf_price_per_unit", "xrf_price_per_common_space",
      "xrf_price_studios_1bed", "xrf_price_2_3bed",
      "dust_swab_wipe_rate", "dust_swab_site_visit_rate", "dust_swab_proj_mgmt_rate",
      "asbestos_sample_rate", "asbestos_site_visit_rate",
      "proposal_email_subject", "proposal_email_body",
    ]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings ?? []) {
    settingsMap[s.key] = s.value;
  }

  const defaults = {
    priceStudios1Bed: settingsMap.xrf_price_studios_1bed ? Number(settingsMap.xrf_price_studios_1bed) : 150,
    price2_3Bed: settingsMap.xrf_price_2_3bed ? Number(settingsMap.xrf_price_2_3bed) : 165,
    pricePerCommonSpace: settingsMap.xrf_price_per_common_space ? Number(settingsMap.xrf_price_per_common_space) : 110,
    wipeRate: settingsMap.dust_swab_wipe_rate ? Number(settingsMap.dust_swab_wipe_rate) : 20,
    dustSwabSiteVisitRate: settingsMap.dust_swab_site_visit_rate ? Number(settingsMap.dust_swab_site_visit_rate) : 375,
    dustSwabProjMgmtRate: settingsMap.dust_swab_proj_mgmt_rate ? Number(settingsMap.dust_swab_proj_mgmt_rate) : 135,
    asbestosSampleRate: settingsMap.asbestos_sample_rate ? Number(settingsMap.asbestos_sample_rate) : null,
    asbestosSiteVisitRate: settingsMap.asbestos_site_visit_rate ? Number(settingsMap.asbestos_site_visit_rate) : 375,
  };

  const addresses = props.map(p => p.building_address).filter(Boolean).join(", ");
  const emailVars: Record<string, string> = {
    address: addresses || `Job #${job.job_number}`,
    job_number: String(job.job_number),
    company: job.client_company ?? "",
  };
  const interpolateTemplate = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => emailVars[k] ?? "");
  const defaultEmailSubject = interpolateTemplate(settingsMap.proposal_email_subject || "Proposal \u2014 {{address}}");
  const defaultEmailBody = interpolateTemplate(
    settingsMap.proposal_email_body ||
    "Hi,\n\nThank you for reaching out. Please find attached our proposal for {{address}}.\n\nOnce you've had a chance to review, let us know a good time to schedule the work. We're looking forward to working with you!"
  );

  const propertyPricings = props.map((p) => computePropertyPricing(p, defaults));
  const aggregatePricing = {
    xrfSubtotal: propertyPricings.reduce((sum, pp) => sum + pp.xrfSubtotal, 0),
    dustSwabSubtotal: propertyPricings.reduce((sum, pp) => sum + pp.dustSwabSubtotal, 0),
    asbestosSubtotal: propertyPricings.reduce((sum, pp) => sum + pp.asbestosSubtotal, 0),
    subtotal: propertyPricings.reduce((sum, pp) => sum + pp.subtotal, 0),
    tax: propertyPricings.reduce((sum, pp) => sum + pp.tax, 0),
    total: propertyPricings.reduce((sum, pp) => sum + pp.total, 0),
  };

  const availabilityByProperty: Record<string, { available: { id: string; name: string }[]; unavailable: { worker: { id: string; name: string }; reason: string }[] }> = {};
  for (const p of props) {
    if (p.scan_date) {
      availabilityByProperty[p.id] = await getAvailableWorkers(
        p.scan_date,
        p.start_time,
        p.estimated_end_time,
        id
      );
    } else {
      const { data: workers } = await supabase
        .from("workers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      availabilityByProperty[p.id] = { available: workers ?? [], unavailable: [] };
    }
  }

  const aggregateHasXrf = props.some((p) => p.has_xrf);
  const aggregateHasDustSwab = props.some((p) => p.has_dust_swab);
  const aggregateHasAsbestos = props.some((p) => p.has_asbestos);

  const firstProp = props[0];
  const firstWorker = firstProp?.worker as { id: string; name: string } | null;

  const updateJobWithId = updateJob.bind(null, id);
  const deleteJobWithId = deleteJob.bind(null, id);
  const dispatchJobWithId = dispatchJob.bind(null, id);
  const sendProposalWithId = async (emailOverrides: { subject: string; body: string }) => {
    "use server";
    return sendProposal(id, emailOverrides);
  };
  const markClientPaidWithId = markClientPaid.bind(null, id);
  const createPropertyWithId = createProperty.bind(null, id);

  const uploadXrfReport = uploadReport.bind(null, id, "xrf");
  const uploadDustSwabReport = uploadReport.bind(null, id, "dust_swab");
  const uploadAsbestosReport = uploadReport.bind(null, id, "asbestos");
  const deleteDocumentWithJobId = deleteDocument.bind(null);

  const uploadSignedProposalActions: Record<string, (formData: FormData) => Promise<{ error?: string }>> = {};
  for (const p of props) {
    uploadSignedProposalActions[p.id] = uploadSignedProposal.bind(null, id, p.id);
  }

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
          {props.length > 0 && ` \u00b7 ${props.length} ${props.length === 1 ? "property" : "properties"}`}
        </p>
      </div>

      <WorkflowBar
        jobId={id}
        jobStatus={job.job_status}
        hasInvoice={!!jobInvoice}
        invoiceStatus={jobInvoice?.status ?? null}
        workerName={firstWorker?.name ?? null}
        clientEmail={job.client_email}
        hasXrf={aggregateHasXrf}
        hasDustSwab={aggregateHasDustSwab}
        hasAsbestos={aggregateHasAsbestos}
        xrfReportStatus={firstProp?.report_status ?? "not_started"}
        dustSwabReportStatus={firstProp?.dust_swab_status ?? "not_started"}
        asbestosReportStatus={firstProp?.asbestos_status ?? "not_started"}
        dispatchAction={dispatchJobWithId}
        markPaidAction={markClientPaidWithId}
        sendProposalAction={sendProposalWithId}
        defaultEmailSubject={defaultEmailSubject}
        defaultEmailBody={defaultEmailBody}
      />

      <JobDetailForm
        key={job.updated_at}
        updateJobAction={updateJobWithId}
        createPropertyAction={createPropertyWithId}
        job={job}
        properties={props.map((p) => {
          const worker = p.worker as { id: string; name: string } | null;
          return {
            ...p,
            workerData: worker,
            availability: availabilityByProperty[p.id] ?? { available: [], unavailable: [] },
            updateAction: updateProperty.bind(null, p.id),
            deleteAction: deleteProperty.bind(null, p.id),
          };
        })}
        officeWorkers={officeWorkers ?? []}
        xrfStatusLabels={XRF_STATUS_LABELS}
        dustSwabStatusLabels={DUST_SWAB_STATUS_LABELS}
        asbestosStatusLabels={ASBESTOS_STATUS_LABELS}
        pricingSummary={aggregatePricing}
        propertyPricings={propertyPricings}
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
        jobDocuments={(jobDocuments ?? []).map((d) => ({
          id: d.id,
          property_id: d.property_id,
          document_type: d.document_type,
          file_path: d.file_path,
          original_filename: d.original_filename,
          created_at: d.created_at,
        }))}
        jobInvoice={jobInvoice ? {
          id: jobInvoice.id,
          status: jobInvoice.status,
          pdf_path: jobInvoice.pdf_path,
          invoice_number: jobInvoice.invoice_number,
          total: jobInvoice.total,
        } : null}
        uploadSignedProposalActions={uploadSignedProposalActions}
        deleteDocumentAction={deleteDocumentWithJobId}
        jobId={id}
        defaultPrices={{
          priceStudios1Bed: defaults.priceStudios1Bed,
          price2_3Bed: defaults.price2_3Bed,
          pricePerCommonSpace: defaults.pricePerCommonSpace,
          wipeRate: defaults.wipeRate,
          dustSwabSiteVisitRate: defaults.dustSwabSiteVisitRate,
          dustSwabProjMgmtRate: defaults.dustSwabProjMgmtRate,
          asbestosSampleRate: defaults.asbestosSampleRate,
          asbestosSiteVisitRate: defaults.asbestosSiteVisitRate,
        }}
      />
    </div>
  );
}
