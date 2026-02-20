import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery, deleteMessage } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getManagementChatIds } from "../get-management-chat-ids";

export async function handleAcceptJob(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const jobId = query.data!.replace("accept_", "");
  const supabase = createAdminClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, name")
    .eq("telegram_chat_id", String(chatId))
    .eq("role", "field")
    .limit(1)
    .maybeSingle();

  if (!worker) {
    await answerCallbackQuery(query.id, "You're not registered as a field worker.");
    await sendMessage(chatId, "You're not registered as a field worker. Send /start first to register.");
    return;
  }

  const { data: accepted, error: rpcError } = await supabase.rpc("accept_job", {
    p_job_id: jobId,
    p_worker_id: worker.id,
  });

  if (rpcError) {
    console.error("accept_job RPC error:", rpcError);
    await answerCallbackQuery(query.id, "Something went wrong. Try again.");
    return;
  }

  if (!accepted) {
    await answerCallbackQuery(query.id, "Sorry, this job has already been taken!");
    await sendMessage(chatId, "This job has already been assigned to another worker.");
    return;
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("job_number, client_company, building_address, scan_date, dispatch_message_ids")
    .eq("id", jobId)
    .single();

  await answerCallbackQuery(query.id, "Job accepted!");

  const msgIds = (job?.dispatch_message_ids ?? []) as Array<{ chat_id: string; message_id: number }>;
  await Promise.allSettled(
    msgIds.map((m) => deleteMessage(m.chat_id, m.message_id))
  );

  await supabase
    .from("jobs")
    .update({ dispatch_message_ids: null })
    .eq("id", jobId);

  await sendMessage(
    chatId,
    `You've accepted <b>Job #${job?.job_number}</b>!\n\n` +
      `Client: ${job?.client_company ?? "\u2014"}\n` +
      `Address: ${job?.building_address ?? "\u2014"}\n` +
      `Date: ${job?.scan_date ?? "TBD"}`
  );

  const mgmtChatIds = await getManagementChatIds(supabase);
  await Promise.allSettled(
    mgmtChatIds.map((id) =>
      sendMessage(
        id,
        `<b>${worker.name}</b> accepted Job #${job?.job_number} (${job?.client_company ?? "\u2014"}).`
      )
    )
  );
}
