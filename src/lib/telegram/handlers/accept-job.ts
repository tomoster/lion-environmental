import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleAcceptJob(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const jobId = query.data!.replace("accept_", "");
  const supabase = createAdminClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, name")
    .eq("telegram_chat_id", String(chatId))
    .single();

  if (!worker) {
    await answerCallbackQuery(query.id, "You're not registered. Send /start first.");
    return;
  }

  const { data: accepted } = await supabase.rpc("accept_job", {
    p_job_id: jobId,
    p_worker_id: worker.id,
  });

  if (!accepted) {
    await answerCallbackQuery(query.id, "Sorry, this job has already been taken!");
    await sendMessage(chatId, "This job has already been assigned to another worker.");
    return;
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("job_number, client_company, building_address, scan_date")
    .eq("id", jobId)
    .single();

  await answerCallbackQuery(query.id, "Job accepted!");
  await sendMessage(
    chatId,
    `You've accepted <b>Job #${job?.job_number}</b>!\n\n` +
      `Client: ${job?.client_company ?? "—"}\n` +
      `Address: ${job?.building_address ?? "—"}\n` +
      `Date: ${job?.scan_date ?? "TBD"}`
  );

  const { data: aviSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "avi_telegram_chat_id")
    .single();

  if (aviSetting?.value) {
    await sendMessage(
      aviSetting.value,
      `<b>${worker.name}</b> accepted Job #${job?.job_number} (${job?.client_company ?? "—"}).`
    );
  }
}
