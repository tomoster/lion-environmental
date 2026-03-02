import type { TelegramCallbackQuery } from "../types";
import { sendMessage, answerCallbackQuery } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInvoiceKeyboard } from "../keyboard";
import { generateInvoiceForJob, generateAndStorePdfForInvoice } from "@/lib/invoices/generate";
import { getManagementChatIds, getOfficeChatIds } from "../get-management-chat-ids";

export async function handleCompleteJob(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const propertyId = query.data!.replace("complete_", "");
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
    .select("id, job_id, building_address, has_dust_swab, jobs(job_number, client_company)")
    .eq("id", propertyId)
    .single();

  if (!property) {
    await answerCallbackQuery(query.id, "Property not found.");
    return;
  }

  const job = property.jobs as { job_number: number; client_company: string | null } | null;

  const updateData: Record<string, unknown> = {
    property_status: "completed",
    report_status: "not_started",
    updated_at: new Date().toISOString(),
  };

  if (property.has_dust_swab) {
    updateData.dust_swab_status = "not_started";
  }

  const { error } = await supabase
    .from("properties")
    .update(updateData)
    .eq("id", propertyId)
    .eq("worker_id", worker.id);

  if (error) {
    await answerCallbackQuery(query.id, "Failed to update property.");
    return;
  }

  const { data: siblingProperties } = await supabase
    .from("properties")
    .select("property_status")
    .eq("job_id", property.job_id);

  const allCompleted = (siblingProperties ?? []).every(
    (p) => p.property_status === "completed"
  );

  if (allCompleted) {
    await supabase
      .from("jobs")
      .update({ job_status: "completed", updated_at: new Date().toISOString() })
      .eq("id", property.job_id);
  }

  await answerCallbackQuery(query.id, "Job marked complete!");
  await sendMessage(
    chatId,
    `Job #${job?.job_number} — ${property.building_address ?? ""} marked as <b>completed</b>. Please send the report document when ready.`
  );

  const managementChatIds = await getManagementChatIds(supabase);

  if (allCompleted) {
    let invoiceInfo = "";
    try {
      const { invoiceId, invoiceNumber, total } = await generateInvoiceForJob(supabase, property.job_id);
      await generateAndStorePdfForInvoice(supabase, invoiceId);

      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(total);

      invoiceInfo = `\n\nInvoice #${invoiceNumber} (${formatted}) generated.`;

      for (const mChatId of managementChatIds) {
        await sendMessage(
          mChatId,
          `<b>${worker.name}</b> completed Job #${job?.job_number} — ${property.building_address ?? ""} (${job?.client_company ?? "\u2014"}). All properties complete!${invoiceInfo}`,
          sendInvoiceKeyboard(invoiceId)
        );
      }
    } catch (invoiceError) {
      console.error("Auto-invoice generation failed:", invoiceError);
      for (const mChatId of managementChatIds) {
        await sendMessage(
          mChatId,
          `<b>${worker.name}</b> completed Job #${job?.job_number} — ${property.building_address ?? ""} (${job?.client_company ?? "\u2014"}). All properties complete!\n\n\u26a0\ufe0f Auto-invoice generation failed. Please generate manually.`
        );
      }
    }
  } else {
    for (const mChatId of managementChatIds) {
      await sendMessage(
        mChatId,
        `<b>${worker.name}</b> completed Job #${job?.job_number} — ${property.building_address ?? ""} (${job?.client_company ?? "\u2014"}).`
      );
    }
  }

  const officeChatIds = await getOfficeChatIds(supabase);
  for (const oChatId of officeChatIds) {
    await sendMessage(
      oChatId,
      `<b>${worker.name}</b> completed Job #${job?.job_number} — ${property.building_address ?? ""} (${job?.client_company ?? "\u2014"}). Please coordinate with them about the report.`
    );
  }
}
