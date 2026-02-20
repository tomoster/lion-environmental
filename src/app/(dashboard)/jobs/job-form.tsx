"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { createJob } from "./actions";
import { calculateEndTime } from "@/lib/scheduling-utils";

type Worker = {
  id: string;
  name: string;
  active: boolean | null;
};

type UnavailableWorker = {
  worker: Worker;
  reason: string;
};

type PricingDefaults = {
  lpt_price_per_unit: number;
  lpt_price_per_common_space: number;
  dust_swab_site_visit: number;
  dust_swab_report: number;
  dust_swab_wipe_rate: number;
};

type DurationDefaults = {
  lpt_duration_per_unit: number;
  lpt_duration_per_common_space: number;
  dust_swab_duration: number;
};

type JobFormProps = {
  workers: Worker[];
  pricingDefaults?: PricingDefaults;
  durationDefaults?: DurationDefaults;
  defaultValues?: {
    client_company?: string;
    client_email?: string;
    building_address?: string;
    prospect_id?: string;
  };
  onSuccess?: () => void;
};

export function JobForm({ workers, pricingDefaults, durationDefaults, defaultValues, onSuccess }: JobFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lptChecked, setLptChecked] = useState(true);
  const [dustSwabChecked, setDustSwabChecked] = useState(false);
  const [numWipes, setNumWipes] = useState(0);
  const [numUnits, setNumUnits] = useState(0);
  const [numCommonSpaces, setNumCommonSpaces] = useState(0);
  const [startTime, setStartTime] = useState("");

  const serviceType = lptChecked && dustSwabChecked
    ? "both"
    : lptChecked
    ? "lpt"
    : dustSwabChecked
    ? "dust_swab"
    : "";

  const pricing = {
    lpt_price_per_unit: pricingDefaults?.lpt_price_per_unit ?? 0,
    lpt_price_per_common_space: pricingDefaults?.lpt_price_per_common_space ?? 0,
    dust_swab_site_visit: pricingDefaults?.dust_swab_site_visit ?? 375,
    dust_swab_report: pricingDefaults?.dust_swab_report ?? 135,
    dust_swab_wipe_rate: pricingDefaults?.dust_swab_wipe_rate ?? 20,
  };

  const duration = {
    lpt_duration_per_unit: durationDefaults?.lpt_duration_per_unit ?? 45,
    lpt_duration_per_common_space: durationDefaults?.lpt_duration_per_common_space ?? 30,
    dust_swab_duration: durationDefaults?.dust_swab_duration ?? 90,
  };

  const estimatedEndTime = useMemo(() => {
    if (!startTime || !serviceType) return "";
    return calculateEndTime(startTime, serviceType, numUnits, numCommonSpaces, duration);
  }, [startTime, serviceType, numUnits, numCommonSpaces, duration]);

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

  const dustSwabTotal =
    pricing.dust_swab_site_visit + pricing.dust_swab_report + numWipes * pricing.dust_swab_wipe_rate;

  return (
    <form action={handleSubmit} className="space-y-4">
      {defaultValues?.prospect_id && (
        <input type="hidden" name="prospect_id" value={defaultValues.prospect_id} />
      )}
      <input type="hidden" name="service_type" value={serviceType} />

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
          <Label htmlFor="client_email">Email</Label>
          <Input
            id="client_email"
            name="client_email"
            type="email"
            defaultValue={defaultValues?.client_email ?? ""}
            placeholder="client@example.com"
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
                checked={lptChecked}
                onCheckedChange={(checked) => setLptChecked(checked === true)}
              />
              <span className="text-sm">LPT</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={dustSwabChecked}
                onCheckedChange={(checked) => setDustSwabChecked(checked === true)}
              />
              <span className="text-sm">Dust Swab</span>
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
          <Input
            id="start_time"
            name="start_time"
            type="time"
            step="300"
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

      {lptChecked && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="num_units">Units</Label>
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
            <Label htmlFor="price_per_unit">Price / Unit ($)</Label>
            <Input
              id="price_per_unit"
              name="price_per_unit"
              type="number"
              min="0"
              step="0.01"
              defaultValue={pricing.lpt_price_per_unit || ""}
              placeholder="0.00"
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
          <div className="space-y-1.5">
            <Label htmlFor="price_per_common_space">Price / Common Space ($)</Label>
            <Input
              id="price_per_common_space"
              name="price_per_common_space"
              type="number"
              min="0"
              step="0.01"
              defaultValue={pricing.lpt_price_per_common_space || ""}
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      {dustSwabChecked && (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Site visit</span>
              <span>${pricing.dust_swab_site_visit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Report</span>
              <span>${pricing.dust_swab_report}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per wipe</span>
              <span>${pricing.dust_swab_wipe_rate}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="num_wipes">Number of Wipes</Label>
            <Input
              id="num_wipes"
              name="num_wipes"
              type="number"
              min="0"
              placeholder="0"
              value={numWipes}
              onChange={(e) => setNumWipes(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Estimated total</span>
            <span>${dustSwabTotal.toFixed(2)}</span>
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
        <Button type="submit" disabled={isPending || !serviceType}>
          {isPending ? "Creating..." : "Create Job"}
        </Button>
      </div>
    </form>
  );
}
