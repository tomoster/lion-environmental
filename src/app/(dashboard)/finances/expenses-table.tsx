"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteExpense } from "./actions";

type ExpenseRow = {
  id: string;
  date: string;
  description: string | null;
  category: string;
  amount: number;
  job_number: number | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  lab_fee: "Lab Fee",
  other: "Other",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ExpensesTable({ expenses }: { expenses: ExpenseRow[] }) {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? expenses
      : expenses.filter((e) => e.category === filter);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="lab_fee">Lab Fee</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Job #</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((expense) => (
              <ExpenseTableRow key={expense.id} expense={expense} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ExpenseTableRow({ expense }: { expense: ExpenseRow }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpense(expense.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Expense deleted");
      }
    });
  }

  return (
    <TableRow className={isPending ? "opacity-50" : undefined}>
      <TableCell className="text-sm">{formatDate(expense.date)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {expense.description || "—"}
      </TableCell>
      <TableCell className="text-sm">
        {CATEGORY_LABELS[expense.category] ?? expense.category}
      </TableCell>
      <TableCell className="text-sm font-mono">
        {expense.job_number ? `#${expense.job_number}` : "—"}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {formatCurrency(expense.amount)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}
