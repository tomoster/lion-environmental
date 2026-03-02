import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery } from "../client";
import { getState, setState, clearState } from "../state";
import { handleReportUpload } from "./document-upload";
import { reportTypeKeyboard } from "../keyboard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleReportForJob(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const propertyId = query.data!.replace("reportfor_", "");
  const supabase = createAdminClient();

  const state = await getState(supabase, String(chatId));
  if (!state || !state.payload.file_id) {
    await answerCallbackQuery(query.id, "Session expired. Please re-send the document.");
    return;
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, has_xrf, has_dust_swab, jobs(job_number, client_company)")
    .eq("id", propertyId)
    .single();

  if (!property) {
    await answerCallbackQuery(query.id, "Property not found.");
    return;
  }

  const job = property.jobs as { job_number: number; client_company: string | null } | null;

  await answerCallbackQuery(query.id);

  const fileId = state.payload.file_id as string;
  const fileName = state.payload.file_name as string;

  if (property.has_xrf && !property.has_dust_swab) {
    await handleReportUpload(supabase, chatId, fileId, fileName, property.id, job?.job_number ?? 0, job?.client_company ?? null, "xrf");
    await clearState(supabase, String(chatId));
    return;
  }
  if (property.has_dust_swab && !property.has_xrf) {
    await handleReportUpload(supabase, chatId, fileId, fileName, property.id, job?.job_number ?? 0, job?.client_company ?? null, "dust_swab");
    await clearState(supabase, String(chatId));
    return;
  }

  await setState(supabase, String(chatId), "awaiting_report_type", {
    file_id: fileId,
    file_name: fileName,
    property_id: property.id,
    job_number: job?.job_number ?? 0,
    client_company: job?.client_company ?? null,
  });
  await sendMessage(
    chatId,
    `Is this the XRF or Dust Swab report for Job #${job?.job_number}?`,
    reportTypeKeyboard(property.id)
  );
}
