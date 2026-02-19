import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/telegram/client";
import { completeJobKeyboard } from "@/lib/telegram/keyboard";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

  const { data: todayJobs } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, building_address, scan_date, start_time, service_type, worker_id, workers(name, telegram_chat_id)")
    .eq("scan_date", today)
    .in("dispatch_status", ["assigned", "open"]);

  const { data: tomorrowJobs } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, building_address, scan_date, start_time, service_type, worker_id, workers(name, telegram_chat_id)")
    .eq("scan_date", tomorrowStr)
    .in("dispatch_status", ["assigned", "open"]);

  const allJobs = [...(todayJobs ?? []), ...(tomorrowJobs ?? [])];

  for (const job of allJobs) {
    const worker = job.workers as { name: string; telegram_chat_id: string | null } | null;
    if (!worker?.telegram_chat_id) continue;

    const isToday = job.scan_date === today;
    const dayLabel = isToday ? "TODAY" : "TOMORROW";

    let timeStr = "";
    if (job.start_time) {
      const [h, m] = job.start_time.split(":").map(Number);
      const period = h >= 12 ? "pm" : "am";
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      timeStr = ` at ${hour12}:${m.toString().padStart(2, "0")}${period}`;
    }

    const text =
      `<b>Reminder: Job ${dayLabel}${timeStr}</b>\n\n` +
      `Job #${job.job_number}\n` +
      `Client: ${job.client_company ?? "—"}\n` +
      `Address: ${job.building_address ?? "—"}`;

    const keyboard = isToday ? completeJobKeyboard(job.id) : undefined;
    await sendMessage(worker.telegram_chat_id, text, keyboard);
  }

  // Send Avi a summary
  const { data: aviSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "avi_telegram_chat_id")
    .single();

  if (aviSetting?.value && allJobs.length > 0) {
    const todayCount = (todayJobs ?? []).length;
    const tomorrowCount = (tomorrowJobs ?? []).length;

    let summary = `<b>Daily Summary</b>\n\n`;
    if (todayCount > 0) {
      summary += `<b>Today (${today}):</b>\n`;
      for (const job of todayJobs ?? []) {
        const worker = job.workers as { name: string } | null;
        summary += `  Job #${job.job_number} — ${job.client_company ?? "—"} (${worker?.name ?? "Unassigned"})\n`;
      }
    }
    if (tomorrowCount > 0) {
      summary += `\n<b>Tomorrow (${tomorrowStr}):</b>\n`;
      for (const job of tomorrowJobs ?? []) {
        const worker = job.workers as { name: string } | null;
        summary += `  Job #${job.job_number} — ${job.client_company ?? "—"} (${worker?.name ?? "Unassigned"})\n`;
      }
    }

    await sendMessage(aviSetting.value, summary);
  }

  return NextResponse.json({
    ok: true,
    reminders_sent: allJobs.length,
  });
}
