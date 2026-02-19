"use client";

import { useState, useTransition } from "react";
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
import { createJob } from "./actions";

type Worker = {
  id: string;
  name: string;
  active: boolean | null;
};

type JobFormProps = {
  workers: Worker[];
  defaultValues?: {
    client_company?: string;
    client_email?: string;
    building_address?: string;
    prospect_id?: string;
  };
  onSuccess?: () => void;
};

const DUST_SWAB_SITE_VISIT = 375;
const DUST_SWAB_REPORT = 135;
const DUST_SWAB_WIPE_RATE = 20;

export function JobForm({ workers, defaultValues, onSuccess }: JobFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serviceType, setServiceType] = useState("lpt");
  const [numWipes, setNumWipes] = useState(0);

  async function handleSubmit(formData: FormData) {
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
    DUST_SWAB_SITE_VISIT + DUST_SWAB_REPORT + numWipes * DUST_SWAB_WIPE_RATE;

  return (
    <form action={handleSubmit} className="space-y-4">
      {defaultValues?.prospect_id && (
        <input type="hidden" name="prospect_id" value={defaultValues.prospect_id} />
      )}

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
        <div className="space-y-1.5">
          <Label htmlFor="service_type">Service Type</Label>
          <Select
            name="service_type"
            value={serviceType}
            onValueChange={setServiceType}
          >
            <SelectTrigger id="service_type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lpt">LPT</SelectItem>
              <SelectItem value="dust_swab">Dust Swab</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scan_date">Scan Date</Label>
          <Input id="scan_date" name="scan_date" type="date" />
        </div>
      </div>

      {serviceType === "lpt" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="num_units">Units</Label>
            <Input
              id="num_units"
              name="num_units"
              type="number"
              min="0"
              placeholder="0"
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
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      {serviceType === "dust_swab" && (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Site visit</span>
              <span>${DUST_SWAB_SITE_VISIT}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Report</span>
              <span>${DUST_SWAB_REPORT}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per wipe</span>
              <span>${DUST_SWAB_WIPE_RATE}</span>
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
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Job"}
        </Button>
      </div>
    </form>
  );
}
