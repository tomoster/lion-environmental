"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProspect, updateProspect } from "./actions";
import { Tables } from "@/lib/supabase/types";

type Prospect = Tables<"prospects">;

interface ProspectFormProps {
  prospect?: Prospect;
  onSuccess?: () => void;
}

export function ProspectForm({ prospect, onSuccess }: ProspectFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(prospect?.status ?? "new");
  const [source, setSource] = useState(prospect?.source ?? "manual");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("status", status);
    formData.set("source", source);

    startTransition(async () => {
      const result = prospect
        ? await updateProspect(prospect.id, formData)
        : await createProspect(formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(prospect ? "Prospect updated." : "Prospect added.");
        if (!prospect) {
          formRef.current?.reset();
          setStatus("new");
          setSource("manual");
        }
        onSuccess?.();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="company">Company *</Label>
          <Input
            id="company"
            name="company"
            required
            defaultValue={prospect?.company ?? ""}
            placeholder="Property management company"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact_name">Contact Name</Label>
          <Input
            id="contact_name"
            name="contact_name"
            defaultValue={prospect?.contact_name ?? ""}
            placeholder="Full name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={prospect?.phone ?? ""}
            placeholder="(###) ###-####"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={prospect?.email ?? ""}
            placeholder="contact@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="next_followup">Next Follow-up</Label>
          <Input
            id="next_followup"
            name="next_followup"
            type="date"
            defaultValue={prospect?.next_followup ?? ""}
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="building_address">Location</Label>
          <Input
            id="building_address"
            name="building_address"
            defaultValue={prospect?.building_address ?? ""}
            placeholder="Brooklyn, New York"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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

        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="apify">Apify</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={prospect?.notes ?? ""}
            placeholder="Additional notes..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? prospect
              ? "Saving..."
              : "Adding..."
            : prospect
              ? "Save Changes"
              : "Add Prospect"}
        </Button>
      </div>
    </form>
  );
}
