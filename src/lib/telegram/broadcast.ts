import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMessage } from "./client";
import { acceptPropertyKeyboard } from "./keyboard";
import { formatServiceTypes } from "@/lib/service-type-utils";
import { timesOverlap } from "@/lib/scheduling-utils";

export async function broadcastPropertyToWorkers(
  supabase: SupabaseClient,
  propertyId: string
) {
  const { data: property } = await supabase
    .from("properties")
    .select("id, job_id, building_address, scan_date, start_time, estimated_end_time, has_xrf, has_dust_swab, has_asbestos, num_units, num_common_spaces, num_wipes, jobs(job_number, client_company, notes)")
    .eq("id", propertyId)
    .single();

  if (!property) throw new Error("Property not found");

  const jobRaw = property.jobs;
  const job = (Array.isArray(jobRaw) ? jobRaw[0] : jobRaw) as { job_number: number; client_company: string | null; notes: string | null } | null;

  const { data: allWorkers } = await supabase
    .from("workers")
    .select("id, name, telegram_chat_id, has_xrf, has_dust_swab, has_asbestos")
    .eq("active", true)
    .eq("role", "field")
    .not("telegram_chat_id", "is", null);

  if (!allWorkers || allWorkers.length === 0) return;

  let workers = allWorkers.filter((w) => {
    if (property.has_xrf && w.has_xrf) return true;
    if (property.has_dust_swab && w.has_dust_swab) return true;
    if (property.has_asbestos && w.has_asbestos) return true;
    return false;
  });

  if (workers.length === 0) return;

  if (property.scan_date) {
    const workerIds = workers.map((w) => w.id);

    const [{ data: blocks }, { data: conflictingProperties }] = await Promise.all([
      supabase
        .from("worker_availability")
        .select("*")
        .in("worker_id", workerIds),
      supabase
        .from("properties")
        .select("id, worker_id, start_time, estimated_end_time, jobs(job_number)")
        .eq("scan_date", property.scan_date)
        .neq("id", propertyId)
        .in("worker_id", workerIds),
    ]);

    const date = new Date(property.scan_date + "T00:00:00");
    const dayOfWeek = date.getDay();

    workers = workers.filter((w) => {
      const workerBlocks = (blocks ?? []).filter((b) => b.worker_id === w.id);

      if (workerBlocks.some((b) => b.type === "recurring" && b.day_of_week === dayOfWeek)) {
        return false;
      }

      if (workerBlocks.some((b) => b.type === "one_off" && b.specific_date === property.scan_date)) {
        return false;
      }

      if (property.start_time && property.estimated_end_time) {
        const hasConflict = (conflictingProperties ?? []).some(
          (p) =>
            p.worker_id === w.id &&
            p.start_time &&
            p.estimated_end_time &&
            timesOverlap(property.start_time!, property.estimated_end_time!, p.start_time!, p.estimated_end_time!)
        );
        if (hasConflict) return false;
      }

      return true;
    });

    if (workers.length === 0) return;
  }

  const serviceLabel = formatServiceTypes(property);

  const scanDate = property.scan_date
    ? new Date(property.scan_date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "TBD";

  let timeStr = "";
  if (property.start_time) {
    const [h, m] = property.start_time.split(":").map(Number);
    const period = h >= 12 ? "pm" : "am";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    timeStr = ` at ${hour12}:${m.toString().padStart(2, "0")}${period}`;
  }

  const text =
    `<b>New Job Available!</b>\n\n` +
    `Job #${job?.job_number ?? "—"} — ${serviceLabel}\n` +
    `Client: ${job?.client_company ?? "—"}\n` +
    `Address: ${property.building_address ?? "—"}\n` +
    `Date: ${scanDate}${timeStr}\n` +
    (property.num_units ? `Units: ${property.num_units}\n` : "") +
    (property.has_xrf && property.num_common_spaces ? `Common Spaces: ${property.num_common_spaces}\n` : "") +
    (property.has_dust_swab && property.num_wipes ? `Wipes: ${property.num_wipes}\n` : "") +
    (job?.notes ? `Notes: ${job.notes}\n` : "");

  const keyboard = acceptPropertyKeyboard(property.id);

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
    .from("properties")
    .update({
      property_status: "scheduled",
      dispatch_message_ids: dispatchMessageIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", propertyId);
}

export async function broadcastJobToWorkers(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("job_id", jobId)
    .in("property_status", ["not_scheduled", "scheduled"]);

  for (const prop of properties ?? []) {
    await broadcastPropertyToWorkers(supabase, prop.id);
  }
}
