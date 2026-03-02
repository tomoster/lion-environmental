import { createClient } from "@/lib/supabase/server";
import { timesOverlap, formatTime12h } from "./scheduling-utils";

export { calculateEndTime } from "./scheduling-utils";

type Worker = {
  id: string;
  name: string;
};

type UnavailableWorker = {
  worker: Worker;
  reason: string;
};

export type AvailabilityResult = {
  available: Worker[];
  unavailable: UnavailableWorker[];
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function getAvailableWorkers(
  scanDate: string,
  startTime: string | null,
  endTime: string | null,
  excludePropertyId?: string
): Promise<AvailabilityResult> {
  const supabase = await createClient();

  const { data: workers } = await supabase
    .from("workers")
    .select("id, name")
    .eq("active", true)
    .order("name");

  if (!workers || workers.length === 0) {
    return { available: [], unavailable: [] };
  }

  const workerIds = workers.map((w) => w.id);

  const [{ data: blocks }, { data: conflictingProps }] = await Promise.all([
    supabase
      .from("worker_availability")
      .select("*")
      .in("worker_id", workerIds),
    supabase
      .from("properties")
      .select("id, worker_id, start_time, estimated_end_time, building_address, jobs(job_number)")
      .eq("scan_date", scanDate)
      .in("worker_id", workerIds),
  ]);

  const date = new Date(scanDate + "T00:00:00");
  const dayOfWeek = date.getDay();

  const available: Worker[] = [];
  const unavailable: UnavailableWorker[] = [];

  for (const worker of workers) {
    const workerBlocks = (blocks ?? []).filter((b) => b.worker_id === worker.id);

    const recurringBlock = workerBlocks.find(
      (b) => b.type === "recurring" && b.day_of_week === dayOfWeek
    );
    if (recurringBlock) {
      const dayName = DAY_NAMES[dayOfWeek];
      unavailable.push({
        worker,
        reason: `Off (every ${dayName})`,
      });
      continue;
    }

    const oneOffBlock = workerBlocks.find(
      (b) => b.type === "one_off" && b.specific_date === scanDate
    );
    if (oneOffBlock) {
      const formatted = new Date(scanDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      unavailable.push({
        worker,
        reason: `Off (${formatted})`,
      });
      continue;
    }

    if (startTime && endTime) {
      const workerProps = (conflictingProps ?? []).filter(
        (p) =>
          p.worker_id === worker.id &&
          p.start_time &&
          p.estimated_end_time &&
          (excludePropertyId ? p.id !== excludePropertyId : true)
      );

      const conflict = workerProps.find((p) =>
        timesOverlap(startTime, endTime, p.start_time!, p.estimated_end_time!)
      );

      if (conflict) {
        const jobNum = (conflict.jobs as { job_number: number } | null)?.job_number;
        const label = jobNum ? `Job #${jobNum}` : (conflict.building_address ?? "another property");
        unavailable.push({
          worker,
          reason: `Busy — ${label}, ${formatTime12h(conflict.start_time!)}–${formatTime12h(conflict.estimated_end_time!)}`,
        });
        continue;
      }
    }

    available.push(worker);
  }

  return { available, unavailable };
}
