"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createJob } from "./actions";
import { calculateEndTime } from "@/lib/scheduling-utils";

type Worker = {
  id: string;
  name: string;
  active: boolean | null;
};

type DurationDefaults = {
  xrf_duration_per_unit: number;
  xrf_duration_per_common_space: number;
  dust_swab_duration: number;
  asbestos_duration: number;
};

type JobFormProps = {
  workers: Worker[];
  durationDefaults?: DurationDefaults;
  defaultValues?: {
    client_company?: string;
    client_contact?: string;
    client_email?: string;
    client_phone?: string;
    building_address?: string;
    prospect_id?: string;
  };
  onSuccess?: () => void;
};

export function JobForm({ workers, durationDefaults, defaultValues, onSuccess }: JobFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [xrfChecked, setXrfChecked] = useState(true);
  const [dustSwabChecked, setDustSwabChecked] = useState(false);
  const [asbestosChecked, setAsbestosChecked] = useState(false);
  const [numWipes, setNumWipes] = useState(0);
  const [numUnits, setNumUnits] = useState(0);
  const [numCommonSpaces, setNumCommonSpaces] = useState(0);
  const [startTime, setStartTime] = useState("");

  const anyServiceChecked = xrfChecked || dustSwabChecked || asbestosChecked;

  const services = { has_xrf: xrfChecked, has_dust_swab: dustSwabChecked, has_asbestos: asbestosChecked };

  const duration = {
    xrf_duration_per_unit: durationDefaults?.xrf_duration_per_unit ?? 45,
    xrf_duration_per_common_space: durationDefaults?.xrf_duration_per_common_space ?? 30,
    dust_swab_duration: durationDefaults?.dust_swab_duration ?? 90,
    asbestos_duration: durationDefaults?.asbestos_duration ?? 60,
  };

  const estimatedEndTime = useMemo(() => {
    if (!startTime || !anyServiceChecked) return "";
    return calculateEndTime(startTime, services, numUnits, numCommonSpaces, duration);
  }, [startTime, xrfChecked, dustSwabChecked, asbestosChecked, numUnits, numCommonSpaces, duration]);

  async function handleSubmit(formData: FormData) {
    if (estimatedEndTime) {
      formData.set("estimated_end_time", estimatedEndTime);
    }
    startTransition(async () => {
      try {
        await createJob(formData);
        onSuccess?.();
        router.refresh();
      } catch {
        // redirect happens inside createJob on success
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {defaultValues?.prospect_id && (
        <input type="hidden" name="prospect_id" value={defaultValues.prospect_id} />
      )}
      <input type="hidden" name="has_xrf" value={xrfChecked ? "true" : "false"} />
      <input type="hidden" name="has_dust_swab" value={dustSwabChecked ? "true" : "false"} />
      <input type="hidden" name="has_asbestos" value={asbestosChecked ? "true" : "false"} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="client_company">Company</Label>
          <Input
            id="client_company"
            name="client_company"
            defaultValue={defaultValues?.client_company ?? ""}
            placeholder="Property management co."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client_contact">Contact</Label>
          <Input
            id="client_contact"
            name="client_contact"
            defaultValue={defaultValues?.client_contact ?? ""}
            placeholder="Contact name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client_email">Email</Label>
          <Input
            id="client_email"
            name="client_email"
            type="email"
            defaultValue={defaultValues?.client_email ?? ""}
            placeholder="client@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client_phone">Phone</Label>
          <Input
            id="client_phone"
            name="client_phone"
            type="tel"
            defaultValue={defaultValues?.client_phone ?? ""}
            placeholder="(###) ###-####"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="building_address">Building Address</Label>
        <Input
          id="building_address"
          name="building_address"
          defaultValue={defaultValues?.building_address ?? ""}
          placeholder="123 Main St, New York, NY"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2.5">
          <Label>Service Type</Label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={xrfChecked}
                onCheckedChange={(checked) => setXrfChecked(checked === true)}
              />
              <span className="text-sm">XRF</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={dustSwabChecked}
                onCheckedChange={(checked) => setDustSwabChecked(checked === true)}
              />
              <span className="text-sm">Dust Swab</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={asbestosChecked}
                onCheckedChange={(checked) => setAsbestosChecked(checked === true)}
              />
              <span className="text-sm">Asbestos</span>
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scan_date">Scan Date</Label>
          <Input id="scan_date" name="scan_date" type="date" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="start_time">Start Time</Label>
          <TimeInput
            id="start_time"
            name="start_time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estimated_end_time_display">Est. End Time</Label>
          <Input
            id="estimated_end_time_display"
            value={estimatedEndTime || "\u2014"}
            readOnly
            className="bg-muted/40 cursor-not-allowed"
          />
        </div>
      </div>

      {xrfChecked && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="num_units">Total Units</Label>
            <Input
              id="num_units"
              name="num_units"
              type="number"
              min="0"
              placeholder="0"
              value={numUnits || ""}
              onChange={(e) => setNumUnits(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="num_common_spaces">Common Spaces</Label>
            <Input
              id="num_common_spaces"
              name="num_common_spaces"
              type="number"
              min="0"
              placeholder="0"
              value={numCommonSpaces || ""}
              onChange={(e) => setNumCommonSpaces(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {dustSwabChecked && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="num_wipes">Number of Wipes</Label>
            <Input
              id="num_wipes"
              name="num_wipes"
              type="number"
              min="0"
              placeholder="0"
              value={numWipes || ""}
              onChange={(e) => setNumWipes(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="worker_id">Assign Worker</Label>
        <Select name="worker_id">
          <SelectTrigger id="worker_id" className="w-full">
            <SelectValue placeholder="Select worker (optional)" />
          </SelectTrigger>
          <SelectContent>
            {workers.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Any additional notes..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending || !anyServiceChecked}>
          {isPending ? "Creating..." : "Create Job"}
        </Button>
      </div>
    </form>
  );
}
