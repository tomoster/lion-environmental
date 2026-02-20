import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const storagePath = path.join("/");

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
