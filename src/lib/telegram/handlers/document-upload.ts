import type { TelegramMessage } from "../types";
import { sendMessage, getFileUrl } from "../client";
import { setState } from "../state";
import { reportForJobKeyboard, reportTypeKeyboard } from "../keyboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoSendReports } from "@/lib/reports/auto-send";

export async function handleDocumentUpload(message: TelegramMessage) {
  const chatId = message.chat.id;
  const doc = message.document!;
  const supabase = createAdminClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("telegram_chat_id", String(chatId))
    .in("role", ["field", "office"])
    .limit(1)
    .maybeSingle();

  if (!worker) {
    await sendMessage(chatId, "You're not registered. Send /start first.");
    return;
  }

  const jobNumberMatch = message.caption?.match(/#?(\d+)/);

  if (jobNumberMatch) {
    const jobNum = parseInt(jobNumberMatch[1], 10);
    const { data: job } = await supabase
      .from("jobs")
      .select("id, job_number, client_company, has_xrf, has_dust_swab")
      .eq("job_number", jobNum)
      .single();

    if (job) {
      await promptReportType(
        supabase, chatId, doc.file_id,
        doc.file_name ?? "report.pdf",
        job.id, job.job_number, job.client_company,
        job.has_xrf, job.has_dust_swab
      );
      return;
    }
  }

  const { data: pendingJobs } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, has_xrf, has_dust_swab")
    .eq("worker_id", worker.id)
    .or(
      "and(has_xrf.eq.true,xrf_report_file_path.is.null,report_status.in.(not_started,writing))," +
      "and(has_dust_swab.eq.true,dust_swab_report_file_path.is.null,dust_swab_status.in.(not_started,writing))"
    );

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
    await promptReportType(
      supabase, chatId, doc.file_id,
      doc.file_name ?? "report.pdf",
      job.id, job.job_number, job.client_company,
      job.has_xrf, job.has_dust_swab
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
        client: j.client_company ?? "\u2014",
      }))
    )
  );
}

async function promptReportType(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
  fileId: string,
  fileName: string,
  jobId: string,
  jobNumber: number,
  clientCompany: string | null,
  hasXrf: boolean,
  hasDustSwab: boolean,
) {
  if (hasXrf && !hasDustSwab) {
    await handleReportUpload(supabase, chatId, fileId, fileName, jobId, jobNumber, clientCompany, "xrf");
    return;
  }
  if (hasDustSwab && !hasXrf) {
    await handleReportUpload(supabase, chatId, fileId, fileName, jobId, jobNumber, clientCompany, "dust_swab");
    return;
  }

  await setState(supabase, String(chatId), "awaiting_report_type", {
    file_id: fileId,
    file_name: fileName,
    job_id: jobId,
    job_number: jobNumber,
    client_company: clientCompany,
  });
  await sendMessage(
    chatId,
    `Is this the XRF or Dust Swab report for Job #${jobNumber}?`,
    reportTypeKeyboard(jobId)
  );
}

export async function handleReportUpload(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
  fileId: string,
  fileName: string,
  jobId: string,
  jobNumber: number,
  clientCompany: string | null,
  reportType: "xrf" | "dust_swab"
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

  const fileColumn = reportType === "xrf" ? "xrf_report_file_path" : "dust_swab_report_file_path";
  const statusColumn = reportType === "xrf" ? "report_status" : "dust_swab_status";
  const typeLabel = reportType === "xrf" ? "XRF" : "Dust Swab";

  await supabase
    .from("jobs")
    .update({
      [fileColumn]: storagePath,
      [statusColumn]: "uploaded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  const { data: jobForEmail } = await supabase
    .from("jobs")
    .select("client_email")
    .eq("id", jobId)
    .single();

  const { sent } = await autoSendReports(supabase, jobId);
  const wasSent = sent.includes(typeLabel);

  if (wasSent) {
    await sendMessage(
      chatId,
      `${typeLabel} report uploaded and sent to ${jobForEmail?.client_email ?? "client"} for Job #${jobNumber} (${clientCompany ?? "\u2014"}).`
    );
  } else {
    await sendMessage(
      chatId,
      `${typeLabel} report uploaded for Job #${jobNumber} (${clientCompany ?? "\u2014"}).`
    );
  }

  const { getManagementChatIds } = await import("../get-management-chat-ids");
  const managementChatIds = await getManagementChatIds(supabase);

  for (const mChatId of managementChatIds) {
    if (wasSent) {
      await sendMessage(
        mChatId,
        `New <b>${typeLabel}</b> report uploaded for <b>Job #${jobNumber}</b> (${clientCompany ?? "\u2014"}) — auto-sent to ${jobForEmail?.client_email ?? "client"}.`
      );
    } else {
      await sendMessage(
        mChatId,
        `New <b>${typeLabel}</b> report uploaded for <b>Job #${jobNumber}</b> (${clientCompany ?? "\u2014"}).`
      );
    }
  }
}
