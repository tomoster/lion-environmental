"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
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
import { Tables } from "@/lib/supabase/types";
import { ProspectForm } from "./prospect-form";
import { deleteProspect } from "./actions";
import { createJobFromProspect } from "../jobs/actions";

type Prospect = Tables<"prospects">;

interface ProspectsTableProps {
  prospects: Prospect[];
  search: string;
  statusFilter: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  called: "Called",
  qualified: "Qualified",
  pricing_sent: "Pricing Sent",
  followup: "Follow-up",
  confirmed: "Confirmed",
  lost: "Lost",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700 border-gray-200",
  called: "bg-blue-100 text-blue-700 border-blue-200",
  qualified: "bg-purple-100 text-purple-700 border-purple-200",
  pricing_sent: "bg-yellow-100 text-yellow-700 border-yellow-200",
  followup: "bg-orange-100 text-orange-700 border-orange-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  lost: "bg-red-100 text-red-700 border-red-200",
};

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

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${month}/${day}/${year}`;
}

function ProspectRow({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete ${prospect.company}? This cannot be undone.`)) return;
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

  return (
    <TableRow>
      <TableCell className="font-medium">{prospect.company}</TableCell>
      <TableCell className="text-muted-foreground">
        {prospect.contact_name ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {prospect.phone ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {prospect.email ?? "—"}
      </TableCell>
      <TableCell>
        <StatusBadge status={prospect.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(prospect.next_followup)}
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
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
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
      </TableCell>
    </TableRow>
  );
}

export function ProspectsTable({
  prospects,
  search,
  statusFilter,
}: ProspectsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "search") params.delete("search");
    router.push(`/prospects?${params.toString()}`);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("search", e.target.value);
    } else {
      params.delete("search");
    }
    router.push(`/prospects?${params.toString()}`);
  }

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    router.push(`/prospects?${params.toString()}`);
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
              <SelectItem value="called">Called</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="pricing_sent">Pricing Sent</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next Follow-up</TableHead>
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

      <p className="text-muted-foreground text-sm">
        {prospects.length} prospect{prospects.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
