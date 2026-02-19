"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createWorker, updateWorker } from "./actions";

type Worker = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  rate: number | null;
};

type WorkerFormProps =
  | { mode: "create"; trigger: React.ReactNode }
  | { mode: "edit"; worker: Worker; trigger: React.ReactNode };

export function WorkerForm(props: WorkerFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const worker = props.mode === "edit" ? props.worker : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result =
        props.mode === "edit"
          ? await updateWorker(props.worker.id, formData)
          : await createWorker(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(props.mode === "edit" ? "Worker updated" : "Worker added");
      setOpen(false);
      formRef.current?.reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {props.mode === "edit" ? "Edit Worker" : "Add Worker"}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={worker?.name ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={worker?.phone ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={worker?.email ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                name="specialization"
                defaultValue={worker?.specialization ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rate">Rate ($/hr)</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                min="0"
                defaultValue={worker?.rate ?? ""}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : props.mode === "edit"
                  ? "Save Changes"
                  : "Add Worker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
