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
import { formatServiceTypes } from "@/lib/service-type-utils";

type Job = {
  id: string;
  job_number: number;
  client_company: string | null;
  building_address: string | null;
  has_xrf: boolean;
  has_dust_swab: boolean;
  has_asbestos: boolean;
  scan_date: string | null;
  job_status: string;
  report_status: string;
  dust_swab_status: string;
  workers: { name: string } | null;
};

type JobsTableProps = {
  jobs: Job[];
};

const JOB_STATUS_LABELS: Record<string, string> = {
  not_dispatched: "Not Dispatched",
  open: "Open",
  assigned: "Assigned",
  completed: "Completed",
};

const XRF_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  writing: "Writing",
  uploaded: "Uploaded",
  sent: "Sent",
};

const DUST_SWAB_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  sent_to_lab: "Sent to Lab",
  results_received: "Results Received",
  writing: "Writing",
  uploaded: "Uploaded",
  sent: "Sent",
};

function jobStatusBadgeClass(status: string): string {
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
    case "not_started":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "writing":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "uploaded":
      return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "sent":
      return "bg-green-100 text-green-700 border-green-200";
    case "sent_to_lab":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "results_received":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

function formatDate(date: string | null): string {
  if (!date) return "\u2014";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JobsTable({ jobs }: JobsTableProps) {
  const router = useRouter();
  const [jobStatusFilter, setJobStatusFilter] = useState("all");

  const filtered = jobs.filter((job) => {
    if (jobStatusFilter !== "all" && job.job_status !== jobStatusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Job status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All job statuses</SelectItem>
            {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {jobStatusFilter !== "all" && (
          <button
            onClick={() => setJobStatusFilter("all")}
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
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-48">Report</TableHead>
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
                    {job.client_company ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {job.building_address ?? "\u2014"}
                  </TableCell>
                  <TableCell>{formatServiceTypes(job)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(job.scan_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.workers?.name ?? "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={jobStatusBadgeClass(job.job_status)}
                    >
                      {JOB_STATUS_LABELS[job.job_status] ?? job.job_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {job.has_xrf && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${reportBadgeClass(job.report_status)}`}
                        >
                          XRF: {XRF_STATUS_LABELS[job.report_status] ?? job.report_status}
                        </Badge>
                      )}
                      {job.has_dust_swab && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${reportBadgeClass(job.dust_swab_status)}`}
                        >
                          DS: {DUST_SWAB_STATUS_LABELS[job.dust_swab_status] ?? job.dust_swab_status}
                        </Badge>
                      )}
                      {!job.has_xrf && !job.has_dust_swab && (
                        <span className="text-xs text-muted-foreground">\u2014</span>
                      )}
                    </div>
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
