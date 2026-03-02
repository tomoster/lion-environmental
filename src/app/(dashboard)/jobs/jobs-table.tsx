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
  job_status: string;
  property_count: number;
  service_types: string;
};

type JobsTableProps = {
  jobs: Job[];
};

const JOB_STATUS_LABELS: Record<string, string> = {
  not_dispatched: "Not Dispatched",
  proposal_sent: "Proposal Sent",
  open: "Open",
  assigned: "Assigned",
  completed: "Completed",
};

function jobStatusBadgeClass(status: string): string {
  switch (status) {
    case "not_dispatched":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "proposal_sent":
      return "bg-purple-100 text-purple-700 border-purple-200";
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
              <TableHead className="w-32">Properties</TableHead>
              <TableHead className="w-36">Service Types</TableHead>
              <TableHead className="w-36">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
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
                  <TableCell className="text-muted-foreground">
                    {job.property_count === 0
                      ? "\u2014"
                      : job.property_count === 1
                        ? "1 building"
                        : `${job.property_count} buildings`}
                  </TableCell>
                  <TableCell className="text-sm">
                    {job.service_types || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={jobStatusBadgeClass(job.job_status)}
                    >
                      {JOB_STATUS_LABELS[job.job_status] ?? job.job_status}
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
