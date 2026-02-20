import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReportEmail } from "@/lib/email/send-report";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const reportType: "xrf" | "dust_swab" = body.reportType ?? "xrf";

  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, client_email, building_address, xrf_report_file_path, dust_swab_report_file_path, has_xrf, has_dust_swab, has_asbestos")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!job.client_email) {
    return NextResponse.json({ error: "No client email on file" }, { status: 400 });
  }

  const filePath = reportType === "xrf" ? job.xrf_report_file_path : job.dust_swab_report_file_path;
  if (!filePath) {
    return NextResponse.json({ error: `No ${reportType} report uploaded` }, { status: 400 });
  }

  try {
    const { data: fileData } = await supabase.storage
      .from("reports")
      .download(filePath);

    if (!fileData) {
      return NextResponse.json({ error: "Failed to download report" }, { status: 500 });
    }

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
      subjectTemplate: settingsMap["report_email_subject"],
      bodyTemplate: settingsMap["report_email_body"],
    });

    const statusColumn = reportType === "xrf" ? "report_status" : "dust_swab_status";
    await supabase
      .from("jobs")
      .update({
        [statusColumn]: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
