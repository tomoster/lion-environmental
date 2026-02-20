import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReportEmail } from "@/lib/email/send-report";

export async function handleSendReport(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const jobId = query.data!.replace("sendreport_", "");
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, client_email, building_address, report_file_path, has_xrf, has_dust_swab, has_asbestos")
    .eq("id", jobId)
    .single();

  if (!job) {
    await answerCallbackQuery(query.id, "Job not found.");
    return;
  }

  if (!job.client_email) {
    await answerCallbackQuery(query.id, "No client email on file.");
    await sendMessage(chatId, "Can't send report — no client email address on file for this job.");
    return;
  }

  if (!job.report_file_path) {
    await answerCallbackQuery(query.id, "No report uploaded.");
    await sendMessage(chatId, "Can't send report — no report file uploaded for this job.");
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
      .download(job.report_file_path);

    if (!fileData) {
      throw new Error("Failed to download report from storage");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const ext = job.report_file_path.split(".").pop() ?? "pdf";
    const filename = `report-job-${job.job_number}.${ext}`;

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
      services: { has_xrf: job.has_xrf, has_dust_swab: job.has_dust_swab, has_asbestos: job.has_asbestos },
      pdfBuffer: buffer,
      filename,
      senderName,
    });

    const reportUpdate: Record<string, unknown> = {
      report_status: "sent",
      updated_at: new Date().toISOString(),
    };
    if (job.has_dust_swab) {
      reportUpdate.dust_swab_status = "sent";
    }

    await supabase
      .from("jobs")
      .update(reportUpdate)
      .eq("id", jobId);

    await answerCallbackQuery(query.id, "Report sent!");
    await sendMessage(
      chatId,
      `Report for Job #${job.job_number} sent to <b>${job.client_email}</b>.`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await answerCallbackQuery(query.id, "Failed to send report.");
    await sendMessage(chatId, `Failed to send report: ${msg}`);
  }
}
