"use client";

import Link from "next/link";
import { formatServiceTypes } from "@/lib/service-type-utils";

type Worker = { id: string; name: string };
type Job = {
  id: string;
  job_number: number;
  client_company: string | null;
  scan_date: string | null;
  start_time: string | null;
  estimated_end_time: string | null;
  worker_id: string | null;
  job_status: string;
  has_xrf: boolean;
  has_dust_swab: boolean;
  has_asbestos: boolean;
};
type Block = {
  id: string;
  worker_id: string | null;
  type: string;
  day_of_week: number | null;
  specific_date: string | null;
  reason: string | null;
};
type Day = { date: string; label: string; dayOfWeek: number };

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")}${period}`;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 border-blue-300 text-blue-800",
  assigned: "bg-amber-100 border-amber-300 text-amber-800",
  in_progress: "bg-violet-100 border-violet-300 text-violet-800",
  completed: "bg-green-100 border-green-300 text-green-800",
};

export function ScheduleGrid({
  workers,
  jobs,
  blocks,
  days,
}: {
  workers: Worker[];
  jobs: Job[];
  blocks: Block[];
  days: Day[];
}) {
  if (workers.length === 0) {
    return (
      <p className="text-muted-foreground">No active field workers found.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border bg-card px-3 py-2 text-left text-sm font-medium">
              Day
            </th>
            {workers.map((w) => (
              <th
                key={w.id}
                className="border bg-card px-3 py-2 text-center text-sm font-medium"
              >
                {w.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const isToday =
              day.date ===
              new Date().toLocaleDateString("en-CA");
            return (
              <tr key={day.date}>
                <td
                  className={`sticky left-0 z-10 border px-3 py-2 text-sm font-medium whitespace-nowrap ${
                    isToday ? "bg-primary/5" : "bg-card"
                  }`}
                >
                  {day.label}
                  {isToday && (
                    <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                      Today
                    </span>
                  )}
                </td>
                {workers.map((worker) => {
                  const dayOff = getDayOff(blocks, worker.id, day);
                  const workerJobs = jobs.filter(
                    (j) =>
                      j.worker_id === worker.id && j.scan_date === day.date
                  );

                  return (
                    <td
                      key={worker.id}
                      className={`border px-2 py-1.5 align-top ${
                        isToday ? "bg-primary/5" : ""
                      } ${dayOff ? "bg-muted/50" : ""}`}
                      style={{ minWidth: 160 }}
                    >
                      {dayOff && (
                        <div className="mb-1 rounded border border-dashed border-muted-foreground/30 bg-muted px-2 py-1 text-xs text-muted-foreground">
                          Day off
                          {dayOff.reason && (
                            <span className="block text-[10px]">
                              {dayOff.reason}
                            </span>
                          )}
                        </div>
                      )}
                      {workerJobs.map((job) => {
                        const colors =
                          STATUS_COLORS[job.job_status] ??
                          "bg-gray-100 border-gray-300 text-gray-800";
                        const serviceLabel = formatServiceTypes(job);
                        return (
                          <Link
                            key={job.id}
                            href={`/jobs/${job.id}`}
                            className={`mb-1 block rounded border px-2 py-1.5 text-xs transition-opacity hover:opacity-80 ${colors}`}
                          >
                            <div className="font-medium">
                              #{job.job_number} — {serviceLabel}
                            </div>
                            {job.client_company && (
                              <div className="truncate opacity-80">
                                {job.client_company}
                              </div>
                            )}
                            {job.start_time && (
                              <div className="mt-0.5 font-mono text-[10px]">
                                {formatTime(job.start_time)}
                                {job.estimated_end_time &&
                                  `–${formatTime(job.estimated_end_time)}`}
                              </div>
                            )}
                          </Link>
                        );
                      })}
                      {!dayOff && workerJobs.length === 0 && (
                        <div className="py-1 text-center text-xs text-muted-foreground/50">
                          --
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getDayOff(blocks: Block[], workerId: string, day: Day) {
  const workerBlocks = blocks.filter((b) => b.worker_id === workerId);

  const recurring = workerBlocks.find(
    (b) => b.type === "recurring" && b.day_of_week === day.dayOfWeek
  );
  if (recurring) return { reason: recurring.reason };

  const oneOff = workerBlocks.find(
    (b) => b.type === "one_off" && b.specific_date === day.date
  );
  if (oneOff) return { reason: oneOff.reason };

  return null;
}
