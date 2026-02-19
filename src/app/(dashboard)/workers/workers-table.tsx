"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkerForm } from "./worker-form";
import { toggleWorkerActive, deleteWorker } from "./actions";

type WorkerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean | null;
  specialization: string | null;
  rate: number | null;
  jobsDone: number;
};

export function WorkersTable({ workers }: { workers: WorkerRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Specialization</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead className="text-right">Jobs Done</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {workers.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={8}
              className="h-24 text-center text-muted-foreground"
            >
              No workers yet. Add one to get started.
            </TableCell>
          </TableRow>
        )}
        {workers.map((worker) => (
          <WorkerTableRow key={worker.id} worker={worker} />
        ))}
      </TableBody>
    </Table>
  );
}

function WorkerTableRow({ worker }: { worker: WorkerRow }) {
  const [isPending, startTransition] = useTransition();

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleWorkerActive(worker.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          worker.active ? "Worker set to inactive" : "Worker set to active"
        );
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWorker(worker.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Worker deleted");
      }
    });
  }

  return (
    <TableRow className={isPending ? "opacity-50" : undefined}>
      <TableCell className="font-medium">
        <Link
          href={`/workers/${worker.id}`}
          className="hover:underline"
        >
          {worker.name}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {worker.phone ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {worker.email ?? "—"}
      </TableCell>
      <TableCell>
        {worker.active ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {worker.specialization ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {worker.rate != null ? `$${worker.rate.toFixed(2)}/hr` : "—"}
      </TableCell>
      <TableCell className="text-right">{worker.jobsDone}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontalIcon className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <WorkerForm
              mode="edit"
              worker={worker}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Edit
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem asChild>
              <Link href={`/workers/${worker.id}`}>View Payments</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleActive}>
              {worker.active ? "Set Inactive" : "Set Active"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
