"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { MailIcon, MoreHorizontalIcon, PlusIcon, UploadIcon, SearchIcon, StickyNoteIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tables } from "@/lib/supabase/types";
import {
  PROSPECT_STATUS_LABELS as STATUS_LABELS,
  PROSPECT_STATUS_COLORS as STATUS_COLORS,
} from "@/lib/prospects/constants";
import { ProspectForm } from "./prospect-form";
import {
  deleteProspect,
  getEmailLog,
  startEmailSequence,
  pauseEmailSequence,
  resumeEmailSequence,
} from "./actions";
import { createJobFromProspect } from "../jobs/actions";

type Prospect = Tables<"prospects">;

interface ProspectsTableProps {
  prospects: Prospect[];
  search: string;
  statusFilter: string;
  stepFilter: string;
  phoneFilter: string;
  page: number;
  totalCount: number;
  pageSize: number;
}


function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const colorClass =
    STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <Badge className={colorClass} variant="outline">
      {label}
    </Badge>
  );
}

const EMAIL_CHIP_COLORS: Record<string, string> = {
  emailing: "text-blue-600",
  no_response: "text-gray-500",
  bounced: "text-red-600",
};

function EmailHistoryDialog({ prospect }: { prospect: Prospect }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      step: number;
      subject: string;
      status: string;
      error: string | null;
      created_at: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    const result = await getEmailLog(prospect.id);
    setLogs(result.logs);
    setLoading(false);
  }

  if (!prospect.seq_step || prospect.seq_step === 0) {
    return null;
  }

  const chipColor = EMAIL_CHIP_COLORS[prospect.status] ?? "text-gray-500";
  let chipLabel = "";
  if (prospect.status === "emailing") {
    chipLabel = prospect.next_send ? `Step ${prospect.seq_step}` : "Paused";
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 ${chipColor} cursor-pointer hover:underline`}
      >
        <MailIcon className="h-3.5 w-3.5" />
        {chipLabel}
      </button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Email History — {prospect.company}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Loading...
          </p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No emails sent yet.
          </p>
        ) : (
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between border-b pb-2 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    Step {log.step}: {log.subject}
                  </p>
                  {log.error && (
                    <p className="text-destructive mt-0.5 text-xs">
                      {log.error}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    log.status === "sent"
                      ? "ml-2 bg-green-100 text-green-700 border-green-200"
                      : "ml-2 bg-red-100 text-red-700 border-red-200"
                  }
                >
                  {log.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${month}/${day}/${year}`;
}


function ProspectRow({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProspect(prospect.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Prospect deleted.");
      }
    });
  }

  function handleCreateJob() {
    startTransition(async () => {
      await createJobFromProspect(prospect.id);
    });
  }

  function handleStartSequence() {
    startTransition(async () => {
      const result = await startEmailSequence(prospect.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Email sequence started.");
      }
    });
  }

  function handlePauseSequence() {
    startTransition(async () => {
      const result = await pauseEmailSequence(prospect.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Email sequence paused.");
      }
    });
  }

  function handleResumeSequence() {
    startTransition(async () => {
      const result = await resumeEmailSequence(prospect.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Email sequence resumed.");
      }
    });
  }

  const canStartSeq = prospect.email && prospect.status === "new";
  const canPauseSeq = prospect.status === "emailing" && !!prospect.next_send;
  const canResumeSeq = prospect.status === "emailing" && !prospect.next_send;

  return (
    <TableRow>
      <TableCell className="font-medium max-w-50 truncate">
        <span className="inline-flex items-center gap-1.5">
          <span className="truncate">{prospect.company}</span>
          {prospect.notes && (
            <span title={prospect.notes}>
              <StickyNoteIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </span>
          )}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {prospect.contact_name ?? "—"}
      </TableCell>
      <TableCell className="hidden xl:table-cell text-muted-foreground">
        {prospect.phone ?? "—"}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm truncate max-w-40">
        {prospect.email ?? "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={prospect.status} />
          <EmailHistoryDialog prospect={prospect} />
        </div>
      </TableCell>
      <TableCell>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Edit
                </DropdownMenuItem>
              </DialogTrigger>
              <DropdownMenuItem onSelect={handleCreateJob}>
                Create Job
              </DropdownMenuItem>
              {canStartSeq && (
                <DropdownMenuItem onSelect={handleStartSequence}>
                  Start Email Sequence
                </DropdownMenuItem>
              )}
              {canPauseSeq && (
                <DropdownMenuItem onSelect={handlePauseSequence}>
                  Pause Emails
                </DropdownMenuItem>
              )}
              {canResumeSeq && (
                <DropdownMenuItem onSelect={handleResumeSequence}>
                  Resume Emails
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Prospect</DialogTitle>
            </DialogHeader>
            <ProspectForm
              prospect={prospect}
              onSuccess={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {prospect.company}?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. The prospect and all related data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export function ProspectsTable({
  prospects,
  search,
  statusFilter,
  stepFilter,
  phoneFilter,
  page,
  totalCount,
  pageSize,
}: ProspectsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);

  const totalPages = Math.ceil(totalCount / pageSize);
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalCount);

  function navigateWithParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`/prospects?${params.toString()}`);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    navigateWithParams({
      search: e.target.value || null,
      page: null,
    });
  }

  function handleStatusChange(value: string) {
    navigateWithParams({
      status: value === "all" ? null : value,
      page: null,
    });
  }

  function handleStepChange(value: string) {
    navigateWithParams({
      step: value === "all" ? null : value,
      page: null,
    });
  }

  function handlePhoneChange(value: string) {
    navigateWithParams({
      phone: value === "all" ? null : value,
      page: null,
    });
  }

  function handlePageChange(newPage: number) {
    navigateWithParams({
      page: newPage === 1 ? null : String(newPage),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search company or contact..."
            defaultValue={search}
            onChange={handleSearchChange}
            className="w-72"
          />
          <Select
            value={statusFilter || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="emailing">Emailing</SelectItem>
              <SelectItem value="no_response">No Response</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={stepFilter || "all"}
            onValueChange={handleStepChange}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All steps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All steps</SelectItem>
              <SelectItem value="0">No emails</SelectItem>
              <SelectItem value="1">Step 1</SelectItem>
              <SelectItem value="2">Step 2</SelectItem>
              <SelectItem value="3">Step 3</SelectItem>
              <SelectItem value="4">Step 4</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={phoneFilter || "all"}
            onValueChange={handlePhoneChange}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All phones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All phones</SelectItem>
              <SelectItem value="enriched">Enriched (direct)</SelectItem>
              <SelectItem value="hq">HQ only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" asChild>
            <Link href="/prospects/apollo">
              <SearchIcon className="mr-1.5 h-4 w-4" />
              Lead Finder
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/prospects/import">
              <UploadIcon className="mr-1.5 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusIcon className="mr-1.5 h-4 w-4" />
                Add Prospect
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Prospect</DialogTitle>
            </DialogHeader>
            <ProspectForm onSuccess={() => setAddOpen(false)} />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="max-w-50">Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="hidden xl:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  No prospects found.
                </TableCell>
              </TableRow>
            ) : (
              prospects.map((prospect) => (
                <ProspectRow key={prospect.id} prospect={prospect} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {totalCount === 0
            ? "No prospects"
            : `Showing ${showingFrom}-${showingTo} of ${totalCount.toLocaleString()} prospects`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
