import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastPropertyToWorkers } from "@/lib/telegram/broadcast";
import { requireAuth } from "@/lib/auth/require-auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  try {
    const body = await request.json().catch(() => ({}));
    const propertyId = body.propertyId as string | undefined;

    if (propertyId) {
      await broadcastPropertyToWorkers(supabase, propertyId);
    } else {
      const { data: properties } = await supabase
        .from("properties")
        .select("id")
        .eq("job_id", id)
        .in("property_status", ["not_scheduled", "scheduled"]);

      if (!properties || properties.length === 0) {
        return NextResponse.json({ error: "No dispatchable properties found for this job" }, { status: 400 });
      }

      for (const prop of properties) {
        await broadcastPropertyToWorkers(supabase, prop.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
