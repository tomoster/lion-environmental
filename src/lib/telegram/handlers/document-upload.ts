import type { TelegramMessage } from "../types";
import { sendMessage, getFileUrl } from "../client";
import { setState } from "../state";
import { sendReportKeyboard, reportForJobKeyboard } from "../keyboard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleDocumentUpload(message: TelegramMessage) {
  const chatId = message.chat.id;
  const doc = message.document!;
  const supabase = createAdminClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("telegram_chat_id", String(chatId))
    .single();

  if (!worker) {
    await sendMessage(chatId, "You're not registered. Send /start first.");
    return;
  }

  const jobNumberMatch = message.caption?.match(/#?(\d+)/);

  if (jobNumberMatch) {
    const jobNum = parseInt(jobNumberMatch[1], 10);
    const { data: job } = await supabase
      .from("jobs")
      .select("id, job_number, client_company")
      .eq("job_number", jobNum)
      .single();

    if (job) {
      await handleReportUpload(
        supabase, chatId, doc.file_id,
        doc.file_name ?? "report.pdf",
        job.id, job.job_number, job.client_company
      );
      return;
    }
  }

  const { data: pendingJobs } = await supabase
    .from("jobs")
    .select("id, job_number, client_company")
    .eq("worker_id", worker.id)
    .in("report_status", ["not_started", "writing"])
    .is("report_file_path", null);

  if (!pendingJobs || pendingJobs.length === 0) {
    await setState(supabase, String(chatId), "awaiting_job_number", {
      file_id: doc.file_id,
      file_name: doc.file_name ?? "report.pdf",
    });
    await sendMessage(
      chatId,
      "Which job is this report for? Please enter the job number."
    );
    return;
  }

  if (pendingJobs.length === 1) {
    const job = pendingJobs[0];
    await handleReportUpload(
      supabase, chatId, doc.file_id,
      doc.file_name ?? "report.pdf",
      job.id, job.job_number, job.client_company
    );
    return;
  }

  await setState(supabase, String(chatId), "awaiting_report_pick", {
    file_id: doc.file_id,
    file_name: doc.file_name ?? "report.pdf",
  });
  await sendMessage(
    chatId,
    "Which job is this report for?",
    reportForJobKeyboard(
      pendingJobs.map((j) => ({
        id: j.id,
        jobNumber: j.job_number,
        client: j.client_company ?? "—",
      }))
    )
  );
}

export async function handleReportUpload(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
  fileId: string,
  fileName: string,
  jobId: string,
  jobNumber: number,
  clientCompany: string | null
) {
  const fileUrl = await getFileUrl(fileId);
  if (!fileUrl) {
    await sendMessage(chatId, "Failed to download the file from Telegram. Please try again.");
    return;
  }

  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) {
    await sendMessage(chatId, "Failed to download the file. Please try again.");
    return;
  }

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const ext = fileName.split(".").pop() ?? "pdf";
  const storagePath = `${jobId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(storagePath, buffer, {
      contentType: ext === "pdf" ? "application/pdf" : "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    await sendMessage(chatId, "Failed to store the report. Please try again.");
    console.error("Report upload error:", uploadError);
    return;
  }

  await supabase
    .from("jobs")
    .update({
      report_file_path: storagePath,
      report_status: "uploaded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  await sendMessage(
    chatId,
    `Report uploaded for Job #${jobNumber} (${clientCompany ?? "—"}).`
  );

  const { getManagementChatIds } = await import("../get-management-chat-ids");
  const managementChatIds = await getManagementChatIds(supabase);

  for (const mChatId of managementChatIds) {
    await sendMessage(
      mChatId,
      `New report uploaded for <b>Job #${jobNumber}</b> (${clientCompany ?? "—"}).`,
      sendReportKeyboard(jobId)
    );
  }
}
