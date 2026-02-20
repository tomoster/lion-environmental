import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInvoiceKeyboard } from "../keyboard";
import { generateInvoiceForJob, generateAndStorePdfForInvoice } from "@/lib/invoices/generate";

export async function handleCompleteJob(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const jobId = query.data!.replace("complete_", "");
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

  const { error } = await supabase
    .from("jobs")
    .update({
      job_status: "completed",
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

  let invoiceInfo = "";
  try {
    const { invoiceId, invoiceNumber, total } = await generateInvoiceForJob(supabase, jobId);
    await generateAndStorePdfForInvoice(supabase, invoiceId);

    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(total);

    invoiceInfo = `\n\nInvoice #${invoiceNumber} (${formatted}) generated.`;

    if (aviSetting?.value) {
      await sendMessage(
        aviSetting.value,
        `<b>${worker.name}</b> completed Job #${job?.job_number} (${job?.client_company ?? "\u2014"} \u2014 ${job?.building_address ?? "\u2014"}).${invoiceInfo}`,
        sendInvoiceKeyboard(invoiceId)
      );
    }
  } catch (invoiceError) {
    console.error("Auto-invoice generation failed:", invoiceError);
    if (aviSetting?.value) {
      await sendMessage(
        aviSetting.value,
        `<b>${worker.name}</b> completed Job #${job?.job_number} (${job?.client_company ?? "\u2014"} \u2014 ${job?.building_address ?? "\u2014"}).\n\n\u26a0\ufe0f Auto-invoice generation failed. Please generate manually.`
      );
    }
  }
}
