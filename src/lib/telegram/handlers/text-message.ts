import type { TelegramMessage } from "../types";
import { sendMessage } from "../client";
import { getState, setState, clearState } from "../state";
import { reportTypeKeyboard, reportForPropertyKeyboard } from "../keyboard";
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

  const { data: properties } = await supabase
    .from("properties")
    .select("id, building_address, has_xrf, has_dust_swab, jobs!inner(job_number, client_company)")
    .eq("jobs.job_number", jobNumber);

  const matched = (properties ?? []).filter(
    (p) => (p.jobs as { job_number: number } | null)?.job_number === jobNumber
  );

  if (matched.length === 0) {
    await sendMessage(chatId, `No properties found for job #${jobNumber}. Try again.`);
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

  if (matched.length === 1) {
    const prop = matched[0];
    const job = prop.jobs as { job_number: number; client_company: string | null };

    if (prop.has_xrf && !prop.has_dust_swab) {
      await handleReportUpload(supabase, chatId, fileId, fileName, prop.id, job.job_number, job.client_company, "xrf");
      await clearState(supabase, String(chatId));
      return;
    }
    if (prop.has_dust_swab && !prop.has_xrf) {
      await handleReportUpload(supabase, chatId, fileId, fileName, prop.id, job.job_number, job.client_company, "dust_swab");
      await clearState(supabase, String(chatId));
      return;
    }

    await setState(supabase, String(chatId), "awaiting_report_type", {
      file_id: fileId,
      file_name: fileName,
      property_id: prop.id,
      job_number: job.job_number,
      client_company: job.client_company,
    });
    await sendMessage(
      chatId,
      `Is this the XRF or Dust Swab report for Job #${job.job_number}?`,
      reportTypeKeyboard(prop.id)
    );
    return;
  }

  await setState(supabase, String(chatId), "awaiting_report_pick", {
    file_id: fileId,
    file_name: fileName,
  });
  await sendMessage(
    chatId,
    "Multiple properties found. Which property is this report for?",
    reportForPropertyKeyboard(
      matched.map((p) => {
        const job = p.jobs as { job_number: number; client_company: string | null };
        return {
          id: p.id,
          jobNumber: job.job_number,
          address: p.building_address ?? "",
          client: job.client_company ?? "\u2014",
        };
      })
    )
  );
}
