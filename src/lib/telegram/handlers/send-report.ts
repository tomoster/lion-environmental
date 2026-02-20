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
    .select("id, job_number, client_company, client_email, building_address, has_xrf, has_dust_swab, has_asbestos")
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

  const { data: reports } = await supabase
    .from("job_reports")
    .select("file_path, original_filename")
    .eq("job_id", jobId)
    .eq("report_type", reportType);

  const typeLabel = reportType === "xrf" ? "XRF" : "Dust Swab";

  if (!reports || reports.length === 0) {
    await answerCallbackQuery(query.id, `No ${typeLabel} report uploaded.`);
    await sendMessage(chatId, `Can't send report \u2014 no ${typeLabel} report files uploaded for this job.`);
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
      throw new Error("Failed to download reports from storage");
    }

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
      attachments,
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

    await answerCallbackQuery(query.id, `${typeLabel} report${attachments.length > 1 ? "s" : ""} sent!`);
    await sendMessage(
      chatId,
      `${attachments.length} ${typeLabel} report${attachments.length > 1 ? "s" : ""} for Job #${job.job_number} sent to <b>${job.client_email}</b>.`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await answerCallbackQuery(query.id, "Failed to send report.");
    await sendMessage(chatId, `Failed to send report: ${msg}`);
  }
}
