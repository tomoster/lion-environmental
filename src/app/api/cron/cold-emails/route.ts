import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendColdEmail } from "@/lib/email/send-cold-email";

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function getETDate(): { hour: number; dayOfWeek: number; todayStr: string } {
  const now = new Date();
  const et = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hour = parseInt(et.find((p) => p.type === "hour")?.value ?? "0", 10);
  const weekday = et.find((p) => p.type === "weekday")?.value ?? "";
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  const todayStr = now.toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

  return { hour, dayOfWeek: dayMap[weekday] ?? 0, todayStr };
}

function calculateNextSend(delayDays: number): string {
  const now = new Date();
  const next = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000);

  // Set to 9am ET + random 0-60 minutes
  const etOffset = getETOffsetMs();
  next.setUTCHours(9, 0, 0, 0);
  next.setTime(next.getTime() - etOffset + Math.floor(Math.random() * 60) * 60 * 1000);

  // Skip weekends
  const day = new Date(next.getTime() + etOffset).getDay();
  if (day === 6) next.setDate(next.getDate() + 2);
  if (day === 0) next.setDate(next.getDate() + 1);

  return next.toISOString();
}

function getETOffsetMs(): number {
  const now = new Date();
  const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
  const etStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(utcStr).getTime() - new Date(etStr).getTime();
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hour, dayOfWeek, todayStr } = getETDate();

  // Business hours: Mon-Fri, 9am-5pm ET
  if (dayOfWeek === 0 || dayOfWeek === 6 || hour < 9 || hour >= 17) {
    return NextResponse.json({ message: "Outside business hours" });
  }

  const supabase = createAdminClient();

  // Load settings
  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .like("key", "cold_email_%");

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    settings[row.key] = row.value;
  }

  const senderName =
    (await supabase
      .from("settings")
      .select("value")
      .eq("key", "sender_name")
      .single()
      .then((r) => r.data?.value)) ?? "Avi Bursztyn";

  const baseDailyLimit = parseInt(settings["cold_email_daily_limit"] ?? "10", 10);
  const rampStart = settings["cold_email_ramp_start"];
  const rampIncrement = parseInt(settings["cold_email_ramp_increment"] ?? "0", 10);

  let dailyLimit = baseDailyLimit;
  if (rampStart && rampIncrement > 0) {
    const startDate = new Date(rampStart + "T00:00:00");
    const daysSinceStart = Math.floor(
      (new Date().getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceStart > 0) {
      dailyLimit = baseDailyLimit + daysSinceStart * rampIncrement;
    }
  }

  const subjectTemplate = settings["cold_email_subject"] ?? "Hello from Lion Environmental";
  const unsubscribeFooter = settings["cold_email_unsubscribe_footer"] ?? "";

  // Check daily limit
  const { count: sentToday } = await supabase
    .from("email_log")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("created_at", `${todayStr}T00:00:00`)
    .lt("created_at", `${todayStr}T23:59:59`);

  const remaining = dailyLimit - (sentToday ?? 0);
  if (remaining <= 0) {
    return NextResponse.json({
      message: "Daily limit reached",
      daily_limit: dailyLimit,
      sent_today: sentToday,
    });
  }

  // Load suppression list
  const { data: suppressedRows } = await supabase
    .from("suppression_list")
    .select("email");
  const suppressed = new Set(
    (suppressedRows ?? []).map((r) => r.email.toLowerCase())
  );

  // Get due prospects
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .eq("seq_status", "active")
    .not("email", "is", null)
    .lte("next_send", new Date().toISOString())
    .order("next_send", { ascending: true })
    .limit(remaining);

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({
      message: "No prospects due",
      sent_today: sentToday,
    });
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const prospect of prospects) {
    const email = prospect.email!.trim().toLowerCase();

    // Suppression check
    if (suppressed.has(email)) {
      await supabase
        .from("prospects")
        .update({ seq_status: "unsubscribed" })
        .eq("id", prospect.id);
      continue;
    }

    const step = prospect.seq_step;
    const bodyTemplate = settings[`cold_email_step_${step}`];
    if (!bodyTemplate || bodyTemplate.startsWith("[PASTE")) {
      continue; // Skip if template not configured
    }

    // Personalize
    const firstName = prospect.contact_name?.split(" ")[0] ?? "there";
    const vars = { first_name: firstName, company: prospect.company };
    const subject = replaceVars(subjectTemplate, vars);
    let body = replaceVars(bodyTemplate, vars);
    if (unsubscribeFooter) {
      body += `\n\n---\n${unsubscribeFooter}`;
    }

    try {
      await sendColdEmail({ to: email, subject, body, senderName });

      // Log success
      await supabase.from("email_log").insert({
        prospect_id: prospect.id,
        company: prospect.company,
        email,
        step,
        subject,
        status: "sent",
      });

      // Advance sequence
      if (step >= 4) {
        await supabase
          .from("prospects")
          .update({
            seq_status: "completed",
            seq_step: 4,
            next_send: null,
          })
          .eq("id", prospect.id);
      } else {
        const delayKey = `cold_email_step_${step}_delay`;
        const delayDays = parseInt(settings[delayKey] ?? "3", 10);
        await supabase
          .from("prospects")
          .update({
            seq_step: step + 1,
            next_send: calculateNextSend(delayDays),
          })
          .eq("id", prospect.id);
      }

      sentCount++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${prospect.company}: ${errorMsg}`);

      // Log failure
      await supabase.from("email_log").insert({
        prospect_id: prospect.id,
        company: prospect.company,
        email,
        step,
        subject,
        status: "failed",
        error: errorMsg,
      });

      // Detect bounces
      const isBounce =
        errorMsg.includes("Invalid") ||
        errorMsg.includes("doesn't exist") ||
        errorMsg.includes("not exist") ||
        errorMsg.includes("rejected");

      if (isBounce) {
        await supabase
          .from("prospects")
          .update({ seq_status: "bounced" })
          .eq("id", prospect.id);

        await supabase
          .from("suppression_list")
          .upsert({ email, reason: "bounce" }, { onConflict: "email" });

        suppressed.add(email);
      }
    }
  }

  return NextResponse.json({
    message: `Sent ${sentCount} emails`,
    sent_count: sentCount,
    daily_limit: dailyLimit,
    sent_today: (sentToday ?? 0) + sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
