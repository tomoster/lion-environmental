import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReportEmail } from "@/lib/email/send-report";

export async function handleSendReport(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const data = query.data!;
  let reportType: "xrf" | "dust_swab";
  let jobId: string;

  if (data.startsWith("sendreport_xrf_")) {
    reportType = "xrf";
    jobId = data.replace("sendreport_xrf_", "");
  } else if (data.startsWith("sendreport_ds_")) {
    reportType = "dust_swab";
    jobId = data.replace("sendreport_ds_", "");
  } else {
    return;
  }

  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, client_email, building_address, xrf_report_file_path, dust_swab_report_file_path, has_xrf, has_dust_swab, has_asbestos")
    .eq("id", jobId)
    .single();

  if (!job) {
    await answerCallbackQuery(query.id, "Job not found.");
    return;
  }

  if (!job.client_email) {
    await answerCallbackQuery(query.id, "No client email on file.");
    await sendMessage(chatId, "Can't send report \u2014 no client email address on file for this job.");
    return;
  }

  const filePath = reportType === "xrf" ? job.xrf_report_file_path : job.dust_swab_report_file_path;
  const typeLabel = reportType === "xrf" ? "XRF" : "Dust Swab";

  if (!filePath) {
    await answerCallbackQuery(query.id, `No ${typeLabel} report uploaded.`);
    await sendMessage(chatId, `Can't send report \u2014 no ${typeLabel} report file uploaded for this job.`);
    return;
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("job_id", jobId)
    .limit(1)
    .maybeSingle();

  if (!invoice || invoice.status !== "paid") {
    await answerCallbackQuery(query.id, "Invoice not paid yet.");
    await sendMessage(chatId, "Invoice hasn't been paid yet. Report can only be sent after payment.");
    return;
  }

  try {
    const { data: fileData } = await supabase.storage
      .from("reports")
      .download(filePath);

    if (!fileData) {
      throw new Error("Failed to download report from storage");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const ext = filePath.split(".").pop() ?? "pdf";
    const prefix = reportType === "xrf" ? "xrf-report" : "dust-swab-report";
    const filename = `${prefix}-job-${job.job_number}.${ext}`;

    const { data: settings } = await supabase
      .from("settings")
      .select("key, value");
    const settingsMap = Object.fromEntries(
      (settings ?? []).map((s) => [s.key, s.value])
    );
    const senderName = settingsMap["sender_name"] ?? "Avi Bursztyn";

    await sendReportEmail({
      to: job.client_email,
      jobNumber: job.job_number,
      clientCompany: job.client_company ?? "Client",
      buildingAddress: job.building_address ?? "",
      serviceType: reportType,
      pdfBuffer: buffer,
      filename,
      senderName,
      subjectTemplate: settingsMap["report_email_subject"],
      bodyTemplate: settingsMap["report_email_body"],
    });

    const statusColumn = reportType === "xrf" ? "report_status" : "dust_swab_status";
    await supabase
      .from("jobs")
      .update({
        [statusColumn]: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await answerCallbackQuery(query.id, `${typeLabel} report sent!`);
    await sendMessage(
      chatId,
      `${typeLabel} report for Job #${job.job_number} sent to <b>${job.client_email}</b>.`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await answerCallbackQuery(query.id, "Failed to send report.");
    await sendMessage(chatId, `Failed to send report: ${msg}`);
  }
}
