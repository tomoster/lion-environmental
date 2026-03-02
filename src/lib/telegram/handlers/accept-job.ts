import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery, deleteMessage } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getManagementChatIds } from "../get-management-chat-ids";

export async function handleAcceptJob(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const propertyId = query.data!.replace("accept_", "");
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

  const { data: property } = await supabase
    .from("properties")
    .select("id, property_status, worker_id, building_address, scan_date, dispatch_message_ids, jobs(job_number, client_company)")
    .eq("id", propertyId)
    .single();

  if (!property) {
    await answerCallbackQuery(query.id, "Property not found.");
    return;
  }

  if (property.worker_id) {
    await answerCallbackQuery(query.id, "Sorry, this job has already been taken!");
    await sendMessage(chatId, "This job has already been assigned to another worker.");
    return;
  }

  const { error: updateError } = await supabase
    .from("properties")
    .update({
      worker_id: worker.id,
      property_status: "assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", propertyId)
    .is("worker_id", null);

  if (updateError) {
    console.error("Property accept error:", updateError);
    await answerCallbackQuery(query.id, "Something went wrong. Try again.");
    return;
  }

  const job = property.jobs as { job_number: number; client_company: string | null } | null;

  await answerCallbackQuery(query.id, "Job accepted!");

  const msgIds = (property.dispatch_message_ids ?? []) as Array<{ chat_id: string; message_id: number }>;
  await Promise.allSettled(
    msgIds.map((m) => deleteMessage(m.chat_id, m.message_id))
  );

  await supabase
    .from("properties")
    .update({ dispatch_message_ids: null })
    .eq("id", propertyId);

  await sendMessage(
    chatId,
    `You've accepted <b>Job #${job?.job_number}</b>!\n\n` +
      `Client: ${job?.client_company ?? "\u2014"}\n` +
      `Address: ${property.building_address ?? "\u2014"}\n` +
      `Date: ${property.scan_date ?? "TBD"}`
  );

  const mgmtChatIds = await getManagementChatIds(supabase);
  await Promise.allSettled(
    mgmtChatIds.map((id) =>
      sendMessage(
        id,
        `<b>${worker.name}</b> accepted Job #${job?.job_number} — ${property.building_address ?? ""} (${job?.client_company ?? "\u2014"}).`
      )
    )
  );
}
