import type { TelegramCallbackQuery } from "../types";
import { answerCallbackQuery } from "../client";
import { getState, clearState } from "../state";
import { handleReportUpload } from "./document-upload";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleReportTypePick(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const data = query.data!;
  const reportType: "xrf" | "dust_swab" = data.startsWith("rtype_xrf_") ? "xrf" : "dust_swab";
  const supabase = createAdminClient();

  const state = await getState(supabase, String(chatId));
  if (!state || state.state_type !== "awaiting_report_type" || !state.payload.file_id) {
    await answerCallbackQuery(query.id, "Session expired. Please re-send the document.");
    return;
  }

  await answerCallbackQuery(query.id, "Uploading report...");
  await handleReportUpload(
    supabase,
    chatId,
    state.payload.file_id as string,
    state.payload.file_name as string,
    state.payload.job_id as string,
    state.payload.job_number as number,
    state.payload.client_company as string | null,
    reportType
  );
  await clearState(supabase, String(chatId));
}
