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
import { MemberForm } from "./member-form";
import { toggleWorkerActive, deleteWorker } from "./actions";

type MemberRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  zelle: string | null;
  active: boolean | null;
  rate_per_unit: number | null;
  rate_per_common_space: number | null;
  role: string;
  telegram_chat_id: string | null;
  jobsDone: number;
};

const ROLE_ORDER = ["management", "field", "office"] as const;

const ROLE_LABELS: Record<string, string> = {
  management: "Management",
  field: "Field Inspectors",
  office: "Office Staff",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  management: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  field: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  office: "bg-amber-100 text-amber-800 hover:bg-amber-100",
};

export function TeamTable({ members }: { members: MemberRow[] }) {
  const grouped = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    members: members.filter((m) => m.role === role),
  })).filter((g) => g.members.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.role}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {group.label}
          </h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Jobs Done</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.members.map((member) => (
                  <MemberTableRow key={member.id} member={member} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
      {grouped.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No team members yet. Add one to get started.
        </div>
      )}
    </div>
  );
}

function MemberTableRow({ member }: { member: MemberRow }) {
  const [isPending, startTransition] = useTransition();

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleWorkerActive(member.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          member.active ? "Member set to inactive" : "Member set to active"
        );
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWorker(member.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Member deleted");
      }
    });
  }

  return (
    <TableRow className={isPending ? "opacity-50" : undefined}>
      <TableCell className="font-medium">
        <Link
          href={`/team/${member.id}`}
          className="hover:underline"
        >
          {member.name}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {member.phone ?? "\u2014"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {member.email ?? "\u2014"}
      </TableCell>
      <TableCell>
        {member.active ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">{member.jobsDone}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontalIcon className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <MemberForm
              mode="edit"
              worker={member}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Edit
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem asChild>
              <Link href={`/team/${member.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleActive}>
              {member.active ? "Set Inactive" : "Set Active"}
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
