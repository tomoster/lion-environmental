import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const storagePath = path.join("/");

  const supabase = createAdminClient();

  const { data: report } = await supabase
    .from("job_reports")
    .select("original_filename")
    .eq("file_path", storagePath)
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(storagePath, 60, {
      download: report?.original_filename || undefined,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
