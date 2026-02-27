"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { formatTime12h } from "@/lib/scheduling-utils";

type JobDetailFormProps = {
  action: (formData: FormData) => Promise<{ proposalError?: string }>;
  job: {
    client_company: string | null;
    client_email: string | null;
    building_address: string | null;
    scan_date: string | null;
    has_xrf: boolean;
    has_dust_swab: boolean;
    has_asbestos: boolean;
    start_time: string | null;
    estimated_end_time: string | null;
    num_units: number | null;
    num_common_spaces: number | null;
    num_wipes: number | null;
    wipe_rate: number | null;
    dust_swab_site_visit_rate: number | null;
    dust_swab_proj_mgmt_rate: number | null;
    num_asbestos_samples: number | null;
    asbestos_sample_rate: number | null;
    asbestos_site_visit_rate: number | null;
    job_status: string;
    report_status: string;
    dust_swab_status: string | null;
    report_writer_id: string | null;
    notes: string | null;
  };
  defaultPricePerUnit: number | null;
  defaultPricePerCommonSpace: number | null;
  defaultWipeRate: number | null;
  defaultDustSwabSiteVisitRate: number | null;
  defaultDustSwabProjMgmtRate: number | null;
  defaultAsbestosSampleRate: number | null;
  defaultAsbestosSiteVisitRate: number | null;
  workerData: { id: string; name: string } | null;
  availability: {
    available: { id: string; name: string }[];
    unavailable: { worker: { id: string; name: string }; reason: string }[];
  };
  officeWorkers: { id: string; name: string }[];
  jobStatusLabels: Record<string, string>;
  xrfStatusLabels: Record<string, string>;
  dustSwabStatusLabels: Record<string, string>;
};

export function JobDetailForm({
  action,
  job,
  defaultPricePerUnit,
  defaultPricePerCommonSpace,
  defaultWipeRate,
  defaultDustSwabSiteVisitRate,
  defaultDustSwabProjMgmtRate,
  defaultAsbestosSampleRate,
  defaultAsbestosSiteVisitRate,
  workerData,
  availability,
  officeWorkers,
  jobStatusLabels,
  xrfStatusLabels,
  dustSwabStatusLabels,
}: JobDetailFormProps) {
  const [isPending, startTransition] = useTransition();
  const [xrfChecked, setXrfChecked] = useState(job.has_xrf);
  const [dustSwabChecked, setDustSwabChecked] = useState(job.has_dust_swab);
  const [asbestosChecked, setAsbestosChecked] = useState(job.has_asbestos);

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          try {
            const result = await action(formData);
            if (result.proposalError) {
              toast.error(`Saved, but proposal email failed: ${result.proposalError}`);
            } else {
              toast.success("Changes saved");
            }
          } catch {
            toast.error("Failed to save changes");
          }
        });
      }}
      className="space-y-6"
    >
      <input type="hidden" name="has_xrf" value={xrfChecked ? "true" : "false"} />
      <input type="hidden" name="has_dust_swab" value={dustSwabChecked ? "true" : "false"} />
      <input type="hidden" name="has_asbestos" value={asbestosChecked ? "true" : "false"} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="client_company">Company</Label>
              <Input
                id="client_company"
                name="client_company"
                defaultValue={job.client_company ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_email">Email</Label>
              <Input
                id="client_email"
                name="client_email"
                type="email"
                defaultValue={job.client_email ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="building_address">Building Address</Label>
            <Input
              id="building_address"
              name="building_address"
              defaultValue={job.building_address ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="scan_date">Scan Date</Label>
              <Input
                id="scan_date"
                name="scan_date"
                type="date"
                defaultValue={job.scan_date ?? ""}
              />
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Start Time</Label>
              <TimeInput
                id="start_time"
                name="start_time"
                defaultValue={job.start_time ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Est. End Time</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                {job.estimated_end_time ? formatTime12h(job.estimated_end_time) : "\u2014"}
              </div>
              <input type="hidden" name="estimated_end_time" value={job.estimated_end_time ?? ""} />
            </div>
          </div>

          {xrfChecked && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="num_units"># Units</Label>
                <Input
                  id="num_units"
                  name="num_units"
                  type="number"
                  min="0"
                  defaultValue={job.num_units ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price_per_unit">$/Unit</Label>
                <Input
                  id="price_per_unit"
                  name="price_per_unit"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={defaultPricePerUnit ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="num_common_spaces"># Common Spaces</Label>
                <Input
                  id="num_common_spaces"
                  name="num_common_spaces"
                  type="number"
                  min="0"
                  defaultValue={job.num_common_spaces ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price_per_common_space">$/Common Space</Label>
                <Input
                  id="price_per_common_space"
                  name="price_per_common_space"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={defaultPricePerCommonSpace ?? ""}
                />
              </div>
            </div>
          )}

          {dustSwabChecked && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="num_wipes"># Wipes</Label>
                <Input
                  id="num_wipes"
                  name="num_wipes"
                  type="number"
                  min="0"
                  defaultValue={job.num_wipes ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wipe_rate">$/Wipe</Label>
                <Input
                  id="wipe_rate"
                  name="wipe_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={defaultWipeRate ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dust_swab_site_visit_rate">Site Visit Rate</Label>
                <Input
                  id="dust_swab_site_visit_rate"
                  name="dust_swab_site_visit_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={defaultDustSwabSiteVisitRate ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dust_swab_proj_mgmt_rate">Proj Mgmt Rate</Label>
                <Input
                  id="dust_swab_proj_mgmt_rate"
                  name="dust_swab_proj_mgmt_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={defaultDustSwabProjMgmtRate ?? ""}
                />
              </div>
            </div>
          )}

          {asbestosChecked && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="num_asbestos_samples"># Samples</Label>
                <Input
                  id="num_asbestos_samples"
                  name="num_asbestos_samples"
                  type="number"
                  min="0"
                  defaultValue={job.num_asbestos_samples ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asbestos_sample_rate">$/Sample</Label>
                <Input
                  id="asbestos_sample_rate"
                  name="asbestos_sample_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={defaultAsbestosSampleRate ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asbestos_site_visit_rate">Site Visit Rate</Label>
                <Input
                  id="asbestos_site_visit_rate"
                  name="asbestos_site_visit_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={defaultAsbestosSiteVisitRate ?? ""}
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="worker_id">Assigned Worker</Label>
              <Select
                name="worker_id"
                defaultValue={workerData?.id ?? "unassigned"}
              >
                <SelectTrigger id="worker_id" className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {availability.available.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                  {availability.unavailable.map(({ worker: w, reason }) => (
                    <SelectItem key={w.id} value={w.id} disabled>
                      {w.name} — {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job_status">Job Status</Label>
              <Select
                name="job_status"
                defaultValue={job.job_status}
              >
                <SelectTrigger id="job_status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(jobStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="report_writer_id">Report Writer</Label>
              <Select
                name="report_writer_id"
                defaultValue={job.report_writer_id ?? "unassigned"}
              >
                <SelectTrigger id="report_writer_id" className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {officeWorkers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {xrfChecked && (
              <div className="space-y-1.5">
                <Label htmlFor="report_status">XRF Report Status</Label>
                <Select name="report_status" defaultValue={job.report_status}>
                  <SelectTrigger id="report_status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(xrfStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dustSwabChecked && (
              <div className="space-y-1.5">
                <Label htmlFor="dust_swab_status">Dust Swab Status</Label>
                <Select name="dust_swab_status" defaultValue={job.dust_swab_status ?? "not_started"}>
                  <SelectTrigger id="dust_swab_status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dustSwabStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!xrfChecked && (
            <input type="hidden" name="report_status" value={job.report_status} />
          )}
          {!dustSwabChecked && (
            <input type="hidden" name="dust_swab_status" value={job.dust_swab_status ?? "not_started"} />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={job.notes ?? ""}
              placeholder="Add notes..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
