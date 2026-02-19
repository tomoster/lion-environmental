import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleCompleteJob(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const jobId = query.data!.replace("complete_", "");
  const supabase = createAdminClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, name")
    .eq("telegram_chat_id", String(chatId))
    .single();

  if (!worker) {
    await answerCallbackQuery(query.id, "You're not registered.");
    return;
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      dispatch_status: "completed",
      report_status: "field_work_done",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("worker_id", worker.id);

  if (error) {
    await answerCallbackQuery(query.id, "Failed to update job.");
    return;
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("job_number, client_company, building_address")
    .eq("id", jobId)
    .single();

  await answerCallbackQuery(query.id, "Job marked complete!");
  await sendMessage(
    chatId,
    `Job #${job?.job_number} marked as <b>completed</b>. Please send the report document when ready.`
  );

  const { data: aviSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "avi_telegram_chat_id")
    .single();

  if (aviSetting?.value) {
    await sendMessage(
      aviSetting.value,
      `<b>${worker.name}</b> completed Job #${job?.job_number} (${job?.client_company ?? "—"} — ${job?.building_address ?? "—"}).`
    );
  }
}
