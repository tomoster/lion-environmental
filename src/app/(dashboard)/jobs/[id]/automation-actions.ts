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

export async function sendReport(jobId: string, reportType: "xrf" | "dust_swab"): Promise<void> {
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, client_email, building_address, xrf_report_file_path, dust_swab_report_file_path, has_xrf, has_dust_swab, has_asbestos")
    .eq("id", jobId)
    .single();

  if (!job) throw new Error("Job not found");
  if (!job.client_email) throw new Error("No client email on file");

  const filePath = reportType === "xrf" ? job.xrf_report_file_path : job.dust_swab_report_file_path;
  if (!filePath) throw new Error(`No ${reportType} report uploaded`);

  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("job_id", jobId)
    .limit(1)
    .maybeSingle();

  if (!invoice || invoice.status !== "paid") {
    throw new Error("Invoice hasn't been paid yet. Report can only be sent after payment.");
  }

  const { data: fileData } = await supabase.storage
    .from("reports")
    .download(filePath);

  if (!fileData) throw new Error("Failed to download report");

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const ext = filePath.split(".").pop() ?? "pdf";
  const prefix = reportType === "xrf" ? "xrf-report" : "dust-swab-report";
  const filename = `${prefix}-job-${job.job_number}.${ext}`;

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
    serviceType: reportType,
    pdfBuffer: buffer,
    filename,
    senderName: settingsMap["sender_name"] ?? "Avi Bursztyn",
  });

  const statusColumn = reportType === "xrf" ? "report_status" : "dust_swab_status";
  await supabase
    .from("jobs")
    .update({
      [statusColumn]: "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}
