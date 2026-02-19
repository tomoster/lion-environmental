"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Job = {
  id: string;
  job_number: number;
  client_company: string | null;
  building_address: string | null;
  service_type: string | null;
  scan_date: string | null;
  dispatch_status: string;
  report_status: string;
  workers: { name: string } | null;
};

type JobsTableProps = {
  jobs: Job[];
};

const DISPATCH_STATUS_LABELS: Record<string, string> = {
  not_dispatched: "Not Dispatched",
  open: "Open",
  assigned: "Assigned",
  completed: "Completed",
};

const REPORT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  field_work_done: "Field Work Done",
  lab_results_pending: "Lab Results Pending",
  writing_report: "Writing Report",
  report_sent: "Report Sent",
  complete: "Complete",
};

function dispatchBadgeClass(status: string): string {
  switch (status) {
    case "not_dispatched":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "open":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "assigned":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "completed":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

function reportBadgeClass(status: string): string {
  switch (status) {
    case "scheduled":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "in_progress":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "field_work_done":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "lab_results_pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "writing_report":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "report_sent":
      return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "complete":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

function formatServiceType(type: string | null): string {
  if (!type) return "—";
  if (type === "lpt") return "LPT";
  if (type === "dust_swab") return "Dust Swab";
  return type;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JobsTable({ jobs }: JobsTableProps) {
  const router = useRouter();
  const [dispatchFilter, setDispatchFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState("all");

  const filtered = jobs.filter((job) => {
    if (dispatchFilter !== "all" && job.dispatch_status !== dispatchFilter) return false;
    if (reportFilter !== "all" && job.report_status !== reportFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Dispatch status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dispatch statuses</SelectItem>
            {Object.entries(DISPATCH_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={reportFilter} onValueChange={setReportFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Report status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All report statuses</SelectItem>
            {Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(dispatchFilter !== "all" || reportFilter !== "all") && (
          <button
            onClick={() => {
              setDispatchFilter("all");
              setReportFilter("all");
            }}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Job #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-32">Scan Date</TableHead>
              <TableHead className="w-36">Worker</TableHead>
              <TableHead className="w-36">Dispatch</TableHead>
              <TableHead className="w-40">Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((job) => (
                <TableRow
                  key={job.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    #{job.job_number}
                  </TableCell>
                  <TableCell className="font-medium">
                    {job.client_company ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {job.building_address ?? "—"}
                  </TableCell>
                  <TableCell>{formatServiceType(job.service_type)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(job.scan_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.workers?.name ?? "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={dispatchBadgeClass(job.dispatch_status)}
                    >
                      {DISPATCH_STATUS_LABELS[job.dispatch_status] ?? job.dispatch_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={reportBadgeClass(job.report_status)}
                    >
                      {REPORT_STATUS_LABELS[job.report_status] ?? job.report_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== jobs.length && ` (filtered from ${jobs.length})`}
      </p>
    </div>
  );
}
