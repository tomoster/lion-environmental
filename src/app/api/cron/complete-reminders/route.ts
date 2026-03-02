import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/telegram/client";
import { completePropertyKeyboard } from "@/lib/telegram/keyboard";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get("force") === "true";
  const supabase = createAdminClient();

  const now = new Date();
  const today = now.toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, building_address, start_time, worker_id, complete_reminder_sent, workers!properties_worker_id_fkey(name, telegram_chat_id), jobs(job_number, client_company)"
    )
    .eq("property_status", "assigned")
    .eq("scan_date", today)
    .not("start_time", "is", null)
    .eq("complete_reminder_sent", false);

  let sent = 0;

  for (const prop of properties ?? []) {
    const worker = prop.workers as {
      name: string;
      telegram_chat_id: string | null;
    } | null;
    if (!worker?.telegram_chat_id) continue;

    const job = prop.jobs as { job_number: number; client_company: string | null } | null;

    if (!force) {
      const [h, m] = prop.start_time!.split(":").map(Number);
      const jobStart = new Date(
        now.toLocaleString("en-US", { timeZone: "America/New_York" })
      );
      jobStart.setHours(h, m, 0, 0);
      const triggerAt = new Date(jobStart.getTime() + 10 * 60 * 1000);

      const nowET = new Date(
        now.toLocaleString("en-US", { timeZone: "America/New_York" })
      );
      if (nowET < triggerAt) continue;
    }

    const text =
      `<b>Job #${job?.job_number ?? "\u2014"}</b> — ${prop.building_address ?? ""} — ready to mark complete?\n\n` +
      `Client: ${job?.client_company ?? "\u2014"}\n` +
      `Address: ${prop.building_address ?? "\u2014"}`;

    await sendMessage(
      worker.telegram_chat_id,
      text,
      completePropertyKeyboard(prop.id)
    );

    await supabase
      .from("properties")
      .update({ complete_reminder_sent: true })
      .eq("id", prop.id);

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
