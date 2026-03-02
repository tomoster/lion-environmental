import type { SupabaseClient } from "@supabase/supabase-js";
import { sendReportEmail } from "@/lib/email/send-report";
import { getExpectedReportCount } from "@/lib/reports/expected-counts";

type AutoSendResult = {
  sent: string[];
  pending: string[];
};

export async function autoSendReports(
  supabase: SupabaseClient,
  propertyId: string
): Promise<AutoSendResult> {
  const sent: string[] = [];
  const pending: string[] = [];

  const { data: property } = await supabase
    .from("properties")
    .select("id, job_id, building_address, has_xrf, has_dust_swab, has_asbestos, report_status, dust_swab_status, asbestos_status, num_studios_1bed, num_2_3bed, num_common_spaces, num_wipes, num_asbestos_samples, jobs(job_number, client_company, client_email)")
    .eq("id", propertyId)
    .single();

  if (!property) return { sent, pending };

  const jobRaw = property.jobs;
  const job = (Array.isArray(jobRaw) ? jobRaw[0] : jobRaw) as { job_number: number; client_company: string | null; client_email: string | null } | null;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("job_id", property.job_id)
    .limit(1)
    .maybeSingle();

  if (!invoice || invoice.status !== "paid") return { sent, pending };
  if (!job?.client_email) return { sent, pending };

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
    .eq("property_id", propertyId);

  const reportsByType = {
    xrf: (allReports ?? []).filter((r) => r.report_type === "xrf"),
    dust_swab: (allReports ?? []).filter((r) => r.report_type === "dust_swab"),
    asbestos: (allReports ?? []).filter((r) => r.report_type === "asbestos"),
  };

  const reportTypes = [
    {
      label: "XRF",
      type: "xrf" as const,
      has: property.has_xrf,
      status: property.report_status,
      statusColumn: "report_status",
    },
    {
      label: "Dust Swab",
      type: "dust_swab" as const,
      has: property.has_dust_swab,
      status: property.dust_swab_status,
      statusColumn: "dust_swab_status",
    },
    {
      label: "Asbestos",
      type: "asbestos" as const,
      has: property.has_asbestos,
      status: property.asbestos_status,
      statusColumn: "asbestos_status",
    },
  ];

  const required = reportTypes.filter((rt) => rt.has);
  const ready = required.filter((rt) => {
    const reports = reportsByType[rt.type];
    const expected = getExpectedReportCount(rt.type, property);
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
      to: job.client_email!,
      jobNumber: job.job_number,
      clientCompany: job.client_company ?? "Client",
      buildingAddress: property.building_address ?? "",
      serviceType: rt.type,
      attachments,
      senderName,
      subjectTemplate: settingsMap["report_email_subject"],
      bodyTemplate: settingsMap["report_email_body"],
      businessName: settingsMap["business_name"],
      businessPhone: settingsMap["business_phone"],
      businessEmail: settingsMap["business_email"],
      signatureText: settingsMap["email_signature"],
    });

    await supabase
      .from("properties")
      .update({
        [rt.statusColumn]: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", propertyId);

    sent.push(rt.label);
  }

  return { sent, pending };
}
