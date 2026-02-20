import type { SupabaseClient } from "@supabase/supabase-js";
import { sendReportEmail } from "@/lib/email/send-report";

type AutoSendResult = {
  sent: string[];
  pending: string[];
};

export async function autoSendReports(
  supabase: SupabaseClient,
  jobId: string
): Promise<AutoSendResult> {
  const sent: string[] = [];
  const pending: string[] = [];

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, client_email, building_address, has_xrf, has_dust_swab, xrf_report_file_path, dust_swab_report_file_path, report_status, dust_swab_status")
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

  const reportTypes = [
    {
      label: "XRF",
      type: "xrf" as const,
      has: job.has_xrf,
      filePath: job.xrf_report_file_path,
      status: job.report_status,
      statusColumn: "report_status",
    },
    {
      label: "Dust Swab",
      type: "dust_swab" as const,
      has: job.has_dust_swab,
      filePath: job.dust_swab_report_file_path,
      status: job.dust_swab_status,
      statusColumn: "dust_swab_status",
    },
  ];

  for (const rt of reportTypes) {
    if (!rt.has) continue;

    if (!rt.filePath || rt.status !== "uploaded") {
      if (rt.status !== "sent") pending.push(rt.label);
      continue;
    }

    const { data: fileData } = await supabase.storage
      .from("reports")
      .download(rt.filePath);

    if (!fileData) {
      pending.push(rt.label);
      continue;
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const ext = rt.filePath.split(".").pop() ?? "pdf";
    const prefix = rt.type === "xrf" ? "xrf-report" : "dust-swab-report";
    const filename = `${prefix}-job-${job.job_number}.${ext}`;

    await sendReportEmail({
      to: job.client_email,
      jobNumber: job.job_number,
      clientCompany: job.client_company ?? "Client",
      buildingAddress: job.building_address ?? "",
      serviceType: rt.type,
      pdfBuffer: buffer,
      filename,
      senderName,
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
