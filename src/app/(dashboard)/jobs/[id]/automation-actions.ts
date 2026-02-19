"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastJobToWorkers } from "@/lib/telegram/broadcast";
import { sendReportEmail } from "@/lib/email/send-report";

export async function dispatchJob(jobId: string): Promise<void> {
  const supabase = createAdminClient();
  await broadcastJobToWorkers(supabase, jobId);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}

export async function sendReport(jobId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, client_email, building_address, report_file_path, service_type")
    .eq("id", jobId)
    .single();

  if (!job) throw new Error("Job not found");
  if (!job.client_email) throw new Error("No client email on file");
  if (!job.report_file_path) throw new Error("No report uploaded");

  const { data: fileData } = await supabase.storage
    .from("reports")
    .download(job.report_file_path);

  if (!fileData) throw new Error("Failed to download report");

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const ext = job.report_file_path.split(".").pop() ?? "pdf";
  const filename = `report-job-${job.job_number}.${ext}`;

  const { data: settings } = await supabase
    .from("settings")
    .select("key, value");
  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s) => [s.key, s.value])
  );

  await sendReportEmail({
    to: job.client_email,
    jobNumber: job.job_number,
    clientCompany: job.client_company ?? "Client",
    buildingAddress: job.building_address ?? "",
    serviceType: job.service_type ?? "lpt",
    pdfBuffer: buffer,
    filename,
    senderName: settingsMap["sender_name"] ?? "Avi Bursztyn",
  });

  await supabase
    .from("jobs")
    .update({
      report_status: "report_sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}
