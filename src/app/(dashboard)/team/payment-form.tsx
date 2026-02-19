"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPayment } from "./actions";

type Job = {
  id: string;
  job_number: number;
  building_address: string | null;
  client_company: string | null;
};

type PaymentFormProps = {
  workerId: string;
  workerJobs: Job[];
  trigger: React.ReactNode;
};

export function PaymentForm({ workerId, workerJobs, trigger }: PaymentFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [jobId, setJobId] = useState<string>("none");
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("job_id", jobId);

    startTransition(async () => {
      const result = await createPayment(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Payment recorded");
      setOpen(false);
      setJobId("none");
      formRef.current?.reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
          <input type="hidden" name="worker_id" value={workerId} />
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                name="payment_date"
                type="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="grid gap-2">
              <Label>Job (optional)</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No job linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job linked</SelectItem>
                  {workerJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      #{job.job_number}{" "}
                      {job.client_company ?? job.building_address ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmation_number">Confirmation # (Zelle)</Label>
              <Input
                id="confirmation_number"
                name="confirmation_number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
