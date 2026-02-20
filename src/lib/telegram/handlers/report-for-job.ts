import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery } from "../client";
import { getState, setState, clearState } from "../state";
import { handleReportUpload } from "./document-upload";
import { reportTypeKeyboard } from "../keyboard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleReportForJob(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const jobId = query.data!.replace("reportfor_", "");
  const supabase = createAdminClient();

  const state = await getState(supabase, String(chatId));
  if (!state || !state.payload.file_id) {
    await answerCallbackQuery(query.id, "Session expired. Please re-send the document.");
    return;
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, has_xrf, has_dust_swab")
    .eq("id", jobId)
    .single();

  if (!job) {
    await answerCallbackQuery(query.id, "Job not found.");
    return;
  }

  await answerCallbackQuery(query.id);

  const fileId = state.payload.file_id as string;
  const fileName = state.payload.file_name as string;

  if (job.has_xrf && !job.has_dust_swab) {
    await handleReportUpload(supabase, chatId, fileId, fileName, job.id, job.job_number, job.client_company, "xrf");
    await clearState(supabase, String(chatId));
    return;
  }
  if (job.has_dust_swab && !job.has_xrf) {
    await handleReportUpload(supabase, chatId, fileId, fileName, job.id, job.job_number, job.client_company, "dust_swab");
    await clearState(supabase, String(chatId));
    return;
  }

  await setState(supabase, String(chatId), "awaiting_report_type", {
    file_id: fileId,
    file_name: fileName,
    job_id: job.id,
    job_number: job.job_number,
    client_company: job.client_company,
  });
  await sendMessage(
    chatId,
    `Is this the XRF or Dust Swab report for Job #${job.job_number}?`,
    reportTypeKeyboard(job.id)
  );
}
