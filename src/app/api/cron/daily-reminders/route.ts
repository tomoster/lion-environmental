import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/telegram/client";
import { completePropertyKeyboard } from "@/lib/telegram/keyboard";
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

  const { data: todayProperties } = await supabase
    .from("properties")
    .select("id, building_address, scan_date, start_time, property_status, worker_id, workers!properties_worker_id_fkey(name, telegram_chat_id), jobs(job_number, client_company)")
    .eq("scan_date", today)
    .in("property_status", ["assigned", "scheduled"]);

  const { data: tomorrowProperties } = await supabase
    .from("properties")
    .select("id, building_address, scan_date, start_time, property_status, worker_id, workers!properties_worker_id_fkey(name, telegram_chat_id), jobs(job_number, client_company)")
    .eq("scan_date", tomorrowStr)
    .in("property_status", ["assigned", "scheduled"]);

  const allProperties = [...(todayProperties ?? []), ...(tomorrowProperties ?? [])];

  for (const prop of allProperties) {
    const worker = prop.workers as { name: string; telegram_chat_id: string | null } | null;
    if (!worker?.telegram_chat_id) continue;

    const job = prop.jobs as { job_number: number; client_company: string | null } | null;
    const isToday = prop.scan_date === today;
    const dayLabel = isToday ? "TODAY" : "TOMORROW";

    let timeStr = "";
    if (prop.start_time) {
      const [h, m] = prop.start_time.split(":").map(Number);
      const period = h >= 12 ? "pm" : "am";
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      timeStr = ` at ${hour12}:${m.toString().padStart(2, "0")}${period}`;
    }

    const text =
      `<b>Reminder: Job ${dayLabel}${timeStr}</b>\n\n` +
      `Job #${job?.job_number ?? "\u2014"}\n` +
      `Client: ${job?.client_company ?? "\u2014"}\n` +
      `Address: ${prop.building_address ?? "\u2014"}`;

    const keyboard = isToday && prop.property_status === "assigned" ? completePropertyKeyboard(prop.id) : undefined;
    await sendMessage(worker.telegram_chat_id, text, keyboard);
  }

  const mgmtChatIds = await getManagementChatIds(supabase);

  if (mgmtChatIds.length > 0 && allProperties.length > 0) {
    const todayCount = (todayProperties ?? []).length;
    const tomorrowCount = (tomorrowProperties ?? []).length;

    let summary = `<b>Daily Summary</b>\n\n`;
    if (todayCount > 0) {
      summary += `<b>Today (${today}):</b>\n`;
      for (const prop of todayProperties ?? []) {
        const worker = prop.workers as { name: string } | null;
        const job = prop.jobs as { job_number: number; client_company: string | null } | null;
        summary += `  Job #${job?.job_number ?? "\u2014"} \u2014 ${prop.building_address ?? job?.client_company ?? "\u2014"} (${worker?.name ?? "Unassigned"})\n`;
      }
    }
    if (tomorrowCount > 0) {
      summary += `\n<b>Tomorrow (${tomorrowStr}):</b>\n`;
      for (const prop of tomorrowProperties ?? []) {
        const worker = prop.workers as { name: string } | null;
        const job = prop.jobs as { job_number: number; client_company: string | null } | null;
        summary += `  Job #${job?.job_number ?? "\u2014"} \u2014 ${prop.building_address ?? job?.client_company ?? "\u2014"} (${worker?.name ?? "Unassigned"})\n`;
      }
    }

    await Promise.allSettled(
      mgmtChatIds.map((id) => sendMessage(id, summary))
    );
  }

  return NextResponse.json({
    ok: true,
    reminders_sent: allProperties.length,
  });
}
