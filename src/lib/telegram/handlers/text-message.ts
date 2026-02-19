import type { TelegramMessage } from "../types";
import { sendMessage } from "../client";
import { getState, clearState } from "../state";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleTextMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  if (!text) return;

  const supabase = createAdminClient();
  const state = await getState(supabase, String(chatId));

  if (state?.state_type === "awaiting_name") {
    await handleNameInput(supabase, chatId, text);
    return;
  }

  if (state?.state_type === "awaiting_job_number") {
    await handleJobNumberInput(supabase, chatId, text, state.payload);
    return;
  }

  await sendMessage(
    chatId,
    "I didn't understand that. Use /start to register, or wait for a job notification."
  );
}

async function handleNameInput(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
  name: string
) {
  const { data: workers } = await supabase
    .from("workers")
    .select("id, name")
    .eq("active", true);

  const match = workers?.find(
    (w) => w.name.toLowerCase() === name.toLowerCase()
  );

  if (!match) {
    await sendMessage(
      chatId,
      `No worker found with the name "${name}". Please try again with your full name as it appears in the system.`
    );
    return;
  }

  await supabase
    .from("workers")
    .update({ telegram_chat_id: String(chatId) })
    .eq("id", match.id);

  await clearState(supabase, String(chatId));

  await sendMessage(
    chatId,
    `Registered! Welcome, <b>${match.name}</b>. You'll receive job notifications here.`
  );
}

async function handleJobNumberInput(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
  text: string,
  payload: Record<string, unknown>
) {
  const jobNumber = parseInt(text, 10);
  if (isNaN(jobNumber)) {
    await sendMessage(chatId, "Please enter a valid job number.");
    return;
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company")
    .eq("job_number", jobNumber)
    .single();

  if (!job) {
    await sendMessage(chatId, `No job found with number #${jobNumber}. Try again.`);
    return;
  }

  const fileId = payload.file_id as string;
  const fileName = payload.file_name as string;

  if (!fileId) {
    await clearState(supabase, String(chatId));
    await sendMessage(chatId, "Something went wrong. Please re-send the document.");
    return;
  }

  const { handleReportUpload } = await import("./document-upload");
  await handleReportUpload(supabase, chatId, fileId, fileName, job.id, job.job_number, job.client_company);
  await clearState(supabase, String(chatId));
}
