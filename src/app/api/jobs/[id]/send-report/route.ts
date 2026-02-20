import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReportEmail } from "@/lib/email/send-report";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, client_email, building_address, report_file_path, has_xrf, has_dust_swab, has_asbestos")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!job.client_email) {
    return NextResponse.json({ error: "No client email on file" }, { status: 400 });
  }

  if (!job.report_file_path) {
    return NextResponse.json({ error: "No report uploaded" }, { status: 400 });
  }

  try {
    const { data: fileData } = await supabase.storage
      .from("reports")
      .download(job.report_file_path);

    if (!fileData) {
      return NextResponse.json({ error: "Failed to download report" }, { status: 500 });
    }

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
      services: { has_xrf: job.has_xrf, has_dust_swab: job.has_dust_swab, has_asbestos: job.has_asbestos },
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
      .eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
