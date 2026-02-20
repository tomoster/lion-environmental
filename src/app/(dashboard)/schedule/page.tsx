import { createClient } from "@/lib/supabase/server";
import { ScheduleGrid } from "./schedule-grid";

function getWeekRange(weekParam?: string) {
  let monday: Date;
  if (weekParam) {
    monday = new Date(weekParam + "T00:00:00");
  } else {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday = new Date(today);
    monday.setDate(today.getDate() + diff);
  }
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const format = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return {
    monday,
    saturday,
    mondayStr: format(monday),
    saturdayStr: format(saturday),
  };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const { monday, mondayStr, saturdayStr } = getWeekRange(params.week);

  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const format = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const supabase = await createClient();

  const [{ data: workers }, { data: jobs }, { data: blocks }] =
    await Promise.all([
      supabase
        .from("workers")
        .select("id, name")
        .eq("active", true)
        .eq("role", "field")
        .order("name"),
      supabase
        .from("jobs")
        .select(
          "id, job_number, client_company, scan_date, start_time, estimated_end_time, worker_id, job_status, has_xrf, has_dust_swab, has_asbestos"
        )
        .gte("scan_date", mondayStr)
        .lte("scan_date", saturdayStr)
        .not("worker_id", "is", null),
      supabase.from("worker_availability").select("*"),
    ]);

  const days: { date: string; label: string; dayOfWeek: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      date: format(d),
      label: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      dayOfWeek: d.getDay(),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <div className="flex items-center gap-2">
          <a
            href={`/schedule?week=${format(prevMonday)}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Prev
          </a>
          <a
            href="/schedule"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            This Week
          </a>
          <a
            href={`/schedule?week=${format(nextMonday)}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Next
          </a>
        </div>
      </div>
      <ScheduleGrid
        workers={workers ?? []}
        jobs={jobs ?? []}
        blocks={blocks ?? []}
        days={days}
      />
    </div>
  );
}
