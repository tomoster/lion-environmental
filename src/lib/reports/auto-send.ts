import type { SupabaseClient } from "@supabase/supabase-js";
import { sendReportEmail } from "@/lib/email/send-report";

type AutoSendResult = {
  sent: string[];
  pending: string[];
};

function getExpectedCount(
  reportType: "xrf" | "dust_swab",
  job: { num_units: number | null; num_common_spaces: number | null; num_wipes: number | null }
): number {
  if (reportType === "xrf") {
    return (job.num_units ?? 0) + (job.num_common_spaces ?? 0);
  }
  return job.num_wipes ?? 0;
}

export async function autoSendReports(
  supabase: SupabaseClient,
  jobId: string
): Promise<AutoSendResult> {
  const sent: string[] = [];
  const pending: string[] = [];

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, client_email, building_address, has_xrf, has_dust_swab, report_status, dust_swab_status, num_units, num_common_spaces, num_wipes")
    .eq("id", jobId)
    .single();

  if (!job) return { sent, pending };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("job_id", jobId)
    .limit(1)
    .maybeSingle();

  if (!invoice || invoice.status !== "paid") return { sent, pending };
  if (!job.client_email) return { sent, pending };

  const { data: settings } = await supabase
    .from("settings")
    .select("key, value");
  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value])
  );
  const senderName = settingsMap["sender_name"] ?? "Avi Bursztyn";

  const { data: allReports } = await supabase
    .from("job_reports")
    .select("id, report_type, file_path, original_filename")
    .eq("job_id", jobId);

  const reportsByType = {
    xrf: (allReports ?? []).filter((r) => r.report_type === "xrf"),
    dust_swab: (allReports ?? []).filter((r) => r.report_type === "dust_swab"),
  };

  const reportTypes = [
    {
      label: "XRF",
      type: "xrf" as const,
      has: job.has_xrf,
      status: job.report_status,
      statusColumn: "report_status",
    },
    {
      label: "Dust Swab",
      type: "dust_swab" as const,
      has: job.has_dust_swab,
      status: job.dust_swab_status,
      statusColumn: "dust_swab_status",
    },
  ];

  const required = reportTypes.filter((rt) => rt.has);
  const ready = required.filter((rt) => {
    const reports = reportsByType[rt.type];
    const expected = getExpectedCount(rt.type, job);
    return rt.status === "uploaded" && reports.length > 0 && (expected === 0 || reports.length >= expected);
  });
  const alreadySent = required.filter((rt) => rt.status === "sent");

  if (ready.length + alreadySent.length < required.length) {
    for (const rt of required) {
      if (rt.status !== "sent" && rt.status !== "uploaded") {
        pending.push(rt.label);
      }
    }
    return { sent, pending };
  }

  for (const rt of ready) {
    const reports = reportsByType[rt.type];
    const attachments: { buffer: Buffer; filename: string }[] = [];

    for (const report of reports) {
      const { data: fileData } = await supabase.storage
        .from("reports")
        .download(report.file_path);

      if (!fileData) continue;

      attachments.push({
        buffer: Buffer.from(await fileData.arrayBuffer()),
        filename: report.original_filename,
      });
    }

    if (attachments.length === 0) {
      pending.push(rt.label);
      continue;
    }

    await sendReportEmail({
      to: job.client_email,
      jobNumber: job.job_number,
      clientCompany: job.client_company ?? "Client",
      buildingAddress: job.building_address ?? "",
      serviceType: rt.type,
      attachments,
      senderName,
      subjectTemplate: settingsMap["report_email_subject"],
      bodyTemplate: settingsMap["report_email_body"],
    });

    await supabase
      .from("jobs")
      .update({
        [rt.statusColumn]: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    sent.push(rt.label);
  }

  return { sent, pending };
}
