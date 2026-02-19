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

type Invoice = {
  id: string;
  invoice_number: number;
  client_company: string | null;
  building_address: string | null;
  total: number | null;
  status: string;
  date_sent: string | null;
  due_date: string | null;
};

type InvoicesTableProps = {
  invoices: Invoice[];
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "draft":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "sent":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "paid":
      return "bg-green-100 text-green-700 border-green-200";
    case "overdue":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  const d = new Date(
    dateString.length === 10 ? dateString + "T00:00:00" : dateString
  );
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {statusFilter !== "all" && (
          <button
            onClick={() => setStatusFilter("all")}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-32">Date Sent</TableHead>
              <TableHead className="w-32">Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    #{inv.invoice_number}
                  </TableCell>
                  <TableCell className="font-medium">
                    {inv.client_company ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {inv.building_address ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(inv.status)}
                    >
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(inv.date_sent)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(inv.due_date)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== invoices.length &&
          ` (filtered from ${invoices.length})`}
      </p>
    </div>
  );
}
