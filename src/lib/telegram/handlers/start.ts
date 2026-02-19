import type { TelegramMessage } from "../types";
import { sendMessage } from "../client";
import { setState } from "../state";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleStart(message: TelegramMessage) {
  const chatId = message.chat.id;
  const supabase = createAdminClient();

  const { data: existingWorker } = await supabase
    .from("workers")
    .select("name")
    .eq("telegram_chat_id", String(chatId))
    .single();

  if (existingWorker) {
    await sendMessage(
      chatId,
      `You're already registered as <b>${existingWorker.name}</b>. You'll receive job notifications here.`
    );
    return;
  }

  await setState(supabase, String(chatId), "awaiting_name");
  await sendMessage(
    chatId,
    "Welcome to Lion Environmental! Please type your full name to register."
  );
}
