import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInvoiceForId } from "@/lib/email/send-invoice";

export async function handleSendInvoice(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const invoiceId = query.data!.replace("sendinv_", "");
  const supabase = createAdminClient();

  try {
    const result = await sendInvoiceForId(invoiceId, supabase);
    await answerCallbackQuery(query.id, "Invoice sent!");
    await sendMessage(
      chatId,
      `Invoice #${result.invoiceNumber} sent to <b>${result.sentTo}</b>.`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await answerCallbackQuery(query.id, "Failed to send invoice.");
    await sendMessage(chatId, `Failed to send invoice: ${msg}`);
  }
}
