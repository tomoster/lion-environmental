import type { TelegramCallbackQuery } from "../types";
import { answerCallbackQuery } from "../client";
import { getState, clearState } from "../state";
import { handleReportUpload } from "./document-upload";
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
    .select("id, job_number, client_company")
    .eq("id", jobId)
    .single();

  if (!job) {
    await answerCallbackQuery(query.id, "Job not found.");
    return;
  }

  await answerCallbackQuery(query.id, "Uploading report...");
  await handleReportUpload(
    supabase,
    chatId,
    state.payload.file_id as string,
    state.payload.file_name as string,
    job.id,
    job.job_number,
    job.client_company
  );
  await clearState(supabase, String(chatId));
}
