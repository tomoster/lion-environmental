"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deletePayment } from "../actions";

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  confirmation_number: string | null;
  notes: string | null;
  job_number: number | null;
};

export function PaymentsTable({
  payments,
  workerId,
}: {
  payments: Payment[];
  workerId: string;
}) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Job #</TableHead>
            <TableHead>Confirmation #</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No payments recorded yet.
              </TableCell>
            </TableRow>
          )}
          {payments.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              workerId={workerId}
            />
          ))}
        </TableBody>
      </Table>
      {payments.length > 0 && (
        <div className="flex justify-end border-t px-6 py-3">
          <span className="text-sm font-medium">
            Total paid:{" "}
            <span className="text-base font-semibold">
              ${total.toFixed(2)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function PaymentRow({
  payment,
  workerId,
}: {
  payment: Payment;
  workerId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePayment(payment.id, workerId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Payment deleted");
      }
    });
  }

  return (
    <TableRow className={isPending ? "opacity-50" : undefined}>
      <TableCell>
        {new Date(payment.payment_date + "T00:00:00").toLocaleDateString(
          "en-US",
          { year: "numeric", month: "short", day: "numeric" }
        )}
      </TableCell>
      <TableCell className="font-medium">
        ${payment.amount.toFixed(2)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {payment.job_number != null ? `#${payment.job_number}` : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {payment.confirmation_number ?? "—"}
      </TableCell>
      <TableCell className="max-w-xs truncate text-muted-foreground">
        {payment.notes ?? "—"}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2Icon className="h-4 w-4" />
          <span className="sr-only">Delete payment</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}
