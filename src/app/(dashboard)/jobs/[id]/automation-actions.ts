"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastJobToWorkers } from "@/lib/telegram/broadcast";
import { autoSendReports } from "@/lib/reports/auto-send";
import { sendMessage } from "@/lib/telegram/client";
import { getManagementChatIds } from "@/lib/telegram/get-management-chat-ids";

export async function dispatchJob(jobId: string): Promise<void> {
  const supabase = createAdminClient();
  await broadcastJobToWorkers(supabase, jobId);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}

export async function markClientPaid(jobId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("job_id", jobId)
    .limit(1)
    .maybeSingle();

  if (!invoice) throw new Error("No invoice found for this job");
  if (invoice.status === "paid") throw new Error("Invoice is already paid");

  await supabase
    .from("invoices")
    .update({
      status: "paid",
      date_paid: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id);

  const { data: job } = await supabase
    .from("jobs")
    .select("job_number, client_email")
    .eq("id", jobId)
    .single();

  const { sent, pending } = await autoSendReports(supabase, jobId);

  const managementChatIds = await getManagementChatIds(supabase);
  const jobLabel = `Job #${job?.job_number ?? "?"}`;
  const email = job?.client_email ?? "unknown";

  let telegramMessage: string;
  if (sent.length > 0 && pending.length === 0) {
    telegramMessage = `Client paid for ${jobLabel}. ${sent.join(" and ")} report${sent.length > 1 ? "s" : ""} sent to ${email}.`;
  } else if (sent.length > 0 && pending.length > 0) {
    telegramMessage = `Client paid for ${jobLabel}. ${sent.join(" and ")} report${sent.length > 1 ? "s" : ""} sent to ${email}. ${pending.join(" and ")} report${pending.length > 1 ? "s" : ""} not ready yet — will send automatically when uploaded.`;
  } else {
    telegramMessage = `Client paid for ${jobLabel}. No reports ready yet — will send automatically when uploaded.`;
  }

  for (const chatId of managementChatIds) {
    await sendMessage(chatId, telegramMessage);
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/invoices");
}
