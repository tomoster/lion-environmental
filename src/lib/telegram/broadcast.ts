import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMessage } from "./client";
import { acceptJobKeyboard } from "./keyboard";
import { formatServiceTypes } from "@/lib/service-type-utils";

export async function broadcastJobToWorkers(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, client_company, building_address, scan_date, start_time, has_xrf, has_dust_swab, has_asbestos, num_units, num_common_spaces, num_wipes, notes")
    .eq("id", jobId)
    .single();

  if (!job) throw new Error("Job not found");

  const { data: allWorkers } = await supabase
    .from("workers")
    .select("id, name, telegram_chat_id, has_xrf, has_dust_swab, has_asbestos")
    .eq("active", true)
    .eq("role", "field")
    .not("telegram_chat_id", "is", null);

  if (!allWorkers || allWorkers.length === 0) return;

  const workers = allWorkers.filter((w) => {
    if (job.has_xrf && w.has_xrf) return true;
    if (job.has_dust_swab && w.has_dust_swab) return true;
    if (job.has_asbestos && w.has_asbestos) return true;
    return false;
  });

  if (workers.length === 0) return;

  const serviceLabel = formatServiceTypes(job);

  const scanDate = job.scan_date
    ? new Date(job.scan_date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "TBD";

  let timeStr = "";
  if (job.start_time) {
    const [h, m] = job.start_time.split(":").map(Number);
    const period = h >= 12 ? "pm" : "am";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    timeStr = ` at ${hour12}:${m.toString().padStart(2, "0")}${period}`;
  }

  const text =
    `<b>New Job Available!</b>\n\n` +
    `Job #${job.job_number} — ${serviceLabel}\n` +
    `Client: ${job.client_company ?? "—"}\n` +
    `Address: ${job.building_address ?? "—"}\n` +
    `Date: ${scanDate}${timeStr}\n` +
    (job.num_units ? `Units: ${job.num_units}\n` : "") +
    (job.has_xrf && job.num_common_spaces ? `Common Spaces: ${job.num_common_spaces}\n` : "") +
    (job.has_dust_swab && job.num_wipes ? `Wipes: ${job.num_wipes}\n` : "") +
    (job.notes ? `Notes: ${job.notes}\n` : "");

  const keyboard = acceptJobKeyboard(job.id);

  const results = await Promise.allSettled(
    workers.map((w) =>
      sendMessage(w.telegram_chat_id!, text, keyboard).then((res) =>
        res ? { chat_id: w.telegram_chat_id!, message_id: res.message_id } : null
      )
    )
  );

  const dispatchMessageIds = results
    .filter((r): r is PromiseFulfilledResult<{ chat_id: string; message_id: number } | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter(Boolean);

  await supabase
    .from("jobs")
    .update({
      job_status: "open",
      dispatch_message_ids: dispatchMessageIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
