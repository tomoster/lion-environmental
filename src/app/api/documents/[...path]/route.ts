import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path } = await params;
  const storagePath = path.join("/");

  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("job_documents")
    .select("original_filename")
    .eq("file_path", storagePath)
    .limit(1)
    .maybeSingle();

  let filename = doc?.original_filename;

  if (!filename) {
    const { data: report } = await supabase
      .from("job_reports")
      .select("original_filename")
      .eq("file_path", storagePath)
      .limit(1)
      .maybeSingle();
    filename = report?.original_filename;
  }

  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(storagePath, 60, {
      download: filename || undefined,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
