import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/telegram/client";
import { getManagementChatIds } from "@/lib/telegram/get-management-chat-ids";

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
    .select("id, job_number, client_company, building_address, scan_date, start_time, worker_id, workers(name, telegram_chat_id)")
    .eq("scan_date", today)
    .in("job_status", ["assigned", "open"]);

  const { data: tomorrowJobs } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, building_address, scan_date, start_time, worker_id, workers(name, telegram_chat_id)")
    .eq("scan_date", tomorrowStr)
    .in("job_status", ["assigned", "open"]);

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
      `Client: ${job.client_company ?? "\u2014"}\n` +
      `Address: ${job.building_address ?? "\u2014"}`;

    await sendMessage(worker.telegram_chat_id, text);
  }

  const mgmtChatIds = await getManagementChatIds(supabase);

  if (mgmtChatIds.length > 0 && allJobs.length > 0) {
    const todayCount = (todayJobs ?? []).length;
    const tomorrowCount = (tomorrowJobs ?? []).length;

    let summary = `<b>Daily Summary</b>\n\n`;
    if (todayCount > 0) {
      summary += `<b>Today (${today}):</b>\n`;
      for (const job of todayJobs ?? []) {
        const worker = job.workers as { name: string } | null;
        summary += `  Job #${job.job_number} \u2014 ${job.client_company ?? "\u2014"} (${worker?.name ?? "Unassigned"})\n`;
      }
    }
    if (tomorrowCount > 0) {
      summary += `\n<b>Tomorrow (${tomorrowStr}):</b>\n`;
      for (const job of tomorrowJobs ?? []) {
        const worker = job.workers as { name: string } | null;
        summary += `  Job #${job.job_number} \u2014 ${job.client_company ?? "\u2014"} (${worker?.name ?? "Unassigned"})\n`;
      }
    }

    await Promise.allSettled(
      mgmtChatIds.map((id) => sendMessage(id, summary))
    );
  }

  return NextResponse.json({
    ok: true,
    reminders_sent: allJobs.length,
  });
}
