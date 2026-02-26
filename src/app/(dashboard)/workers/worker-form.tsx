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
  role: string;
  rate_per_unit: number | null;
  rate_per_common_space: number | null;
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
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                name="role"
                defaultValue={worker?.role ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rate_per_unit">Rate per Unit ($)</Label>
              <Input
                id="rate_per_unit"
                name="rate_per_unit"
                type="number"
                step="0.01"
                min="0"
                defaultValue={worker?.rate_per_unit ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rate_per_common_space">Rate per Common Space ($)</Label>
              <Input
                id="rate_per_common_space"
                name="rate_per_common_space"
                type="number"
                step="0.01"
                min="0"
                defaultValue={worker?.rate_per_common_space ?? ""}
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
