import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReportEmail } from "@/lib/email/send-report";
import { requireAuth } from "@/lib/auth/require-auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const reportType: "xrf" | "dust_swab" = body.reportType ?? "xrf";

  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, client_email, building_address, has_xrf, has_dust_swab, has_asbestos")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!job.client_email) {
    return NextResponse.json({ error: "No client email on file" }, { status: 400 });
  }

  const { data: reports } = await supabase
    .from("job_reports")
    .select("file_path, original_filename")
    .eq("job_id", id)
    .eq("report_type", reportType);

  if (!reports || reports.length === 0) {
    return NextResponse.json({ error: `No ${reportType} reports uploaded` }, { status: 400 });
  }

  try {
    const attachments: { buffer: Buffer; filename: string }[] = [];

    for (const report of reports) {
      const { data: fileData } = await supabase.storage
        .from("reports")
        .download(report.file_path);

      if (!fileData) continue;

      attachments.push({
        buffer: Buffer.from(await fileData.arrayBuffer()),
        filename: report.original_filename,
      });
    }

    if (attachments.length === 0) {
      return NextResponse.json({ error: "Failed to download reports" }, { status: 500 });
    }

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
      attachments,
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
