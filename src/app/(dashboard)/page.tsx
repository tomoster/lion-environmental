import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function daysOverdue(dueDateStr: string | null): number {
  if (!dueDateStr) return 0;
  const due = new Date(dueDateStr + "T00:00:00");
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((todayStart.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
}

const PROSPECT_STATUS_LABELS: Record<string, string> = {
  new: "New",
  called: "Called",
  qualified: "Qualified",
  pricing_sent: "Pricing Sent",
  followup: "Follow-up",
  confirmed: "Confirmed",
  lost: "Lost",
};

const PROSPECT_STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700 border-gray-200",
  called: "bg-blue-100 text-blue-700 border-blue-200",
  qualified: "bg-purple-100 text-purple-700 border-purple-200",
  pricing_sent: "bg-yellow-100 text-yellow-700 border-yellow-200",
  followup: "bg-orange-100 text-orange-700 border-orange-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  lost: "bg-red-100 text-red-700 border-red-200",
};

const DISPATCH_STATUS_LABELS: Record<string, string> = {
  not_dispatched: "Not Dispatched",
  open: "Open",
  assigned: "Assigned",
  completed: "Completed",
};

function dispatchBadgeClass(status: string): string {
  switch (status) {
    case "open": return "bg-blue-100 text-blue-700 border-blue-200";
    case "assigned": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "completed": return "bg-green-100 text-green-700 border-green-200";
    default: return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

const PIPELINE_STATUSES = ["new", "called", "qualified", "pricing_sent", "followup"];

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const tzOffset = -5 * 60;
  const etNow = new Date(now.getTime() + (now.getTimezoneOffset() + (-tzOffset)) * 60 * 1000);
  const monthStart = new Date(etNow.getFullYear(), etNow.getMonth(), 1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);
  const todayIso = etNow.toISOString().slice(0, 10);

  const [
    { data: activeProspects },
    { data: jobsThisMonth },
    { data: paidInvoices },
    { data: outstandingInvoices },
    { data: pipelineProspects },
    { data: upcomingJobs },
    { data: overdueInvoices },
    { data: recentProspects },
    { data: recentJobs },
    { data: recentPaidInvoices },
  ] = await Promise.all([
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .not("status", "in", '("confirmed","lost")'),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStartIso),
    supabase
      .from("invoices")
      .select("total")
      .eq("status", "paid")
      .gte("date_paid", monthStartIso),
    supabase
      .from("invoices")
      .select("total")
      .in("status", ["sent", "overdue"]),
    supabase
      .from("prospects")
      .select("status")
      .in("status", PIPELINE_STATUSES),
    supabase
      .from("jobs")
      .select("id, job_number, client_company, building_address, scan_date, dispatch_status")
      .gte("scan_date", todayIso)
      .order("scan_date", { ascending: true })
      .limit(5),
    supabase
      .from("invoices")
      .select("id, invoice_number, client_company, total, due_date, status")
      .or(`status.eq.overdue,and(status.eq.sent,due_date.lt.${todayIso})`)
      .order("due_date", { ascending: true }),
    supabase
      .from("prospects")
      .select("id, company, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("jobs")
      .select("id, job_number, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("invoices")
      .select("id, invoice_number, total, date_paid, created_at")
      .eq("status", "paid")
      .order("date_paid", { ascending: false })
      .limit(10),
  ]);

  const activeProspectsCount = activeProspects?.length ?? 0;
  const jobsThisMonthCount = jobsThisMonth?.length ?? 0;
  const revenueThisMonth = (paidInvoices ?? []).reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const outstanding = (outstandingInvoices ?? []).reduce((sum, inv) => sum + (inv.total ?? 0), 0);

  const pipelineCounts: Record<string, number> = {};
  for (const status of PIPELINE_STATUSES) pipelineCounts[status] = 0;
  for (const p of pipelineProspects ?? []) {
    if (p.status in pipelineCounts) pipelineCounts[p.status]++;
  }
  const pipelineTotal = Object.values(pipelineCounts).reduce((a, b) => a + b, 0);

  type ActivityItem = { key: string; label: string; date: string | null; sortDate: number };
  const activityItems: ActivityItem[] = [];

  for (const p of recentProspects ?? []) {
    activityItems.push({
      key: `prospect-${p.id}`,
      label: `New prospect: ${p.company}`,
      date: p.created_at,
      sortDate: p.created_at ? new Date(p.created_at).getTime() : 0,
    });
  }
  for (const j of recentJobs ?? []) {
    activityItems.push({
      key: `job-${j.id}`,
      label: `Job #${j.job_number} created`,
      date: j.created_at,
      sortDate: j.created_at ? new Date(j.created_at).getTime() : 0,
    });
  }
  for (const inv of recentPaidInvoices ?? []) {
    activityItems.push({
      key: `invoice-${inv.id}`,
      label: `Invoice #${inv.invoice_number} paid (${formatCurrency(inv.total ?? 0)})`,
      date: inv.date_paid ?? inv.created_at,
      sortDate: inv.date_paid
        ? new Date(inv.date_paid).getTime()
        : inv.created_at
          ? new Date(inv.created_at).getTime()
          : 0,
    });
  }

  activityItems.sort((a, b) => b.sortDate - a.sortDate);
  const recentActivity = activityItems.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lion Environmental — operations overview
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Prospects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeProspectsCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">in pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jobs This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{jobsThisMonthCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">created in {now.toLocaleString("en-US", { month: "long" })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(revenueThisMonth)}</p>
            <p className="mt-1 text-xs text-muted-foreground">paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(outstanding)}</p>
            <p className="mt-1 text-xs text-muted-foreground">sent + overdue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipelineTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No active prospects.</p>
            ) : (
              PIPELINE_STATUSES.map((status) => {
                const count = pipelineCounts[status] ?? 0;
                const pct = pipelineTotal > 0 ? (count / pipelineTotal) * 100 : 0;
                const colorClass = PROSPECT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className={colorClass}>
                        {PROSPECT_STATUS_LABELS[status]}
                      </Badge>
                      <span className="font-medium tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground/20 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
            <div className="pt-1 border-t text-xs text-muted-foreground">
              {pipelineTotal} prospect{pipelineTotal !== 1 ? "s" : ""} total
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((item) => (
                  <li key={item.key} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-foreground">{item.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(item.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Upcoming Jobs</CardTitle>
            <Link
              href="/jobs"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {(upcomingJobs ?? []).length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No upcoming jobs scheduled.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6 w-20">Job #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Address</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead className="pr-6 w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(upcomingJobs ?? []).map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="pl-6 font-mono text-sm font-medium">
                        #{job.job_number}
                      </TableCell>
                      <TableCell className="font-medium max-w-[120px] truncate">
                        {job.client_company ?? "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs max-w-[160px] truncate">
                        {job.building_address ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(job.scan_date)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <Badge variant="outline" className={dispatchBadgeClass(job.dispatch_status)}>
                          {DISPATCH_STATUS_LABELS[job.dispatch_status] ?? job.dispatch_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Overdue Invoices</CardTitle>
            <Link
              href="/invoices"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {(overdueInvoices ?? []).length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No overdue invoices.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6 w-24">Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="w-28 text-right">Amount</TableHead>
                    <TableHead className="w-28">Due Date</TableHead>
                    <TableHead className="pr-6 w-28">Days Late</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overdueInvoices ?? []).map((inv) => {
                    const late = daysOverdue(inv.due_date);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="pl-6 font-mono text-sm font-medium">
                          #{inv.invoice_number}
                        </TableCell>
                        <TableCell className="font-medium max-w-[120px] truncate">
                          {inv.client_company ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatCurrency(inv.total ?? 0)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(inv.due_date)}
                        </TableCell>
                        <TableCell className="pr-6">
                          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                            {late}d
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
