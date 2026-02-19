"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWorker, updateWorker } from "./actions";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  zelle: string | null;
  specialization: string | null;
  rate_per_unit: number | null;
  rate_per_common_space: number | null;
  role: string;
  telegram_chat_id: string | null;
};

type MemberFormProps =
  | { mode: "create"; trigger: React.ReactNode }
  | { mode: "edit"; worker: Member; trigger: React.ReactNode };

export function MemberForm(props: MemberFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const editWorker = props.mode === "edit" ? props.worker : null;
  const [role, setRole] = useState(editWorker?.role ?? "field");
  const [zelleSameAsPhone, setZelleSameAsPhone] = useState(
    !!editWorker?.phone && !!editWorker?.zelle && editWorker.phone === editWorker.zelle
  );
  const [phone, setPhone] = useState(editWorker?.phone ?? "");
  const [zelle, setZelle] = useState(editWorker?.zelle ?? "");

  const worker = editWorker;
  const showRates = role !== "management";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("role", role);

    startTransition(async () => {
      const result =
        props.mode === "edit"
          ? await updateWorker(props.worker.id, formData)
          : await createWorker(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(props.mode === "edit" ? "Member updated" : "Member added");
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
            {props.mode === "edit" ? "Edit Member" : "Add Team Member"}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="field">Field Inspector</SelectItem>
                  <SelectItem value="office">Office Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zelle">Zelle</Label>
              <Input
                id="zelle"
                name="zelle"
                value={zelleSameAsPhone ? phone : zelle}
                onChange={(e) => setZelle(e.target.value)}
                disabled={zelleSameAsPhone}
                placeholder="Phone number or email"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="zelle_same"
                  checked={zelleSameAsPhone}
                  onCheckedChange={(checked) =>
                    setZelleSameAsPhone(checked === true)
                  }
                />
                <Label
                  htmlFor="zelle_same"
                  className="text-xs text-muted-foreground font-normal"
                >
                  Same as phone number
                </Label>
              </div>
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
              <Label htmlFor="telegram_chat_id">Telegram Chat ID</Label>
              <Input
                id="telegram_chat_id"
                name="telegram_chat_id"
                defaultValue={worker?.telegram_chat_id ?? ""}
                placeholder="Numeric chat ID from Telegram"
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
            {showRates && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="rate_per_unit">Rate / Unit ($)</Label>
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
                  <Label htmlFor="rate_per_common_space">Rate / Common Space ($)</Label>
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
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : props.mode === "edit"
                  ? "Save Changes"
                  : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
