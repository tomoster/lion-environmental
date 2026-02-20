import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/telegram/client";
import { completeJobKeyboard } from "@/lib/telegram/keyboard";

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

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, job_number, client_company, building_address, start_time, worker_id, workers(name, telegram_chat_id)"
    )
    .eq("job_status", "assigned")
    .eq("scan_date", today)
    .not("start_time", "is", null)
    .eq("complete_reminder_sent", false);

  let sent = 0;

  for (const job of jobs ?? []) {
    const worker = job.workers as {
      name: string;
      telegram_chat_id: string | null;
    } | null;
    if (!worker?.telegram_chat_id) continue;

    if (!force) {
      const [h, m] = job.start_time!.split(":").map(Number);
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
      `<b>Job #${job.job_number}</b> — ready to mark complete?\n\n` +
      `Client: ${job.client_company ?? "\u2014"}\n` +
      `Address: ${job.building_address ?? "\u2014"}`;

    await sendMessage(
      worker.telegram_chat_id,
      text,
      completeJobKeyboard(job.id)
    );

    await supabase
      .from("jobs")
      .update({ complete_reminder_sent: true })
      .eq("id", job.id);

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
