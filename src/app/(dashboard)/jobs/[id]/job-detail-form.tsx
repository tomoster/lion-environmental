"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTime12h } from "@/lib/scheduling-utils";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

type JobDetailFormProps = {
  action: (formData: FormData) => Promise<void>;
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
    num_studios_1bed: number | null;
    num_2_3bed: number | null;
    num_common_spaces: number | null;
    num_wipes: number | null;
    wipe_rate: number | null;
    dust_swab_site_visit_rate: number | null;
    dust_swab_proj_mgmt_rate: number | null;
    num_asbestos_samples: number | null;
    asbestos_sample_rate: number | null;
    asbestos_site_visit_rate: number | null;
    report_status: string;
    dust_swab_status: string | null;
    asbestos_status: string | null;
    report_writer_id: string | null;
    notes: string | null;
  };
  defaultPriceStudios1Bed: number | null;
  defaultPrice2_3Bed: number | null;
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
  xrfStatusLabels: Record<string, string>;
  dustSwabStatusLabels: Record<string, string>;
  asbestosStatusLabels: Record<string, string>;
  pricingSummary: {
    xrfSubtotal: number;
    dustSwabSubtotal: number;
    asbestosSubtotal: number;
    subtotal: number;
    tax: number;
    total: number;
  };
  uploadActions: {
    xrf: (formData: FormData) => Promise<void>;
    dustSwab: (formData: FormData) => Promise<void>;
    asbestos: (formData: FormData) => Promise<void>;
  };
  jobReports: {
    id: string;
    report_type: string;
    file_path: string;
    original_filename: string;
  }[];
  expectedCounts: { xrf: number; dustSwab: number; asbestos: number };
};

export function JobDetailForm({
  action,
  job,
  defaultPriceStudios1Bed,
  defaultPrice2_3Bed,
  defaultPricePerCommonSpace,
  defaultWipeRate,
  defaultDustSwabSiteVisitRate,
  defaultDustSwabProjMgmtRate,
  defaultAsbestosSampleRate,
  defaultAsbestosSiteVisitRate,
  workerData,
  availability,
  officeWorkers,
  xrfStatusLabels,
  dustSwabStatusLabels,
  asbestosStatusLabels,
  pricingSummary,
  uploadActions,
  jobReports,
  expectedCounts,
}: JobDetailFormProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("details");
  const [xrfChecked, setXrfChecked] = useState(job.has_xrf);
  const [dustSwabChecked, setDustSwabChecked] = useState(job.has_dust_swab);
  const [asbestosChecked, setAsbestosChecked] = useState(job.has_asbestos);

  const xrfReports = jobReports.filter((r) => r.report_type === "xrf");
  const dustSwabReports = jobReports.filter(
    (r) => r.report_type === "dust_swab"
  );
  const asbestosReports = jobReports.filter(
    (r) => r.report_type === "asbestos"
  );

  const fileIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-muted-foreground shrink-0"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );

  return (
    <>
      <form
        action={(formData) => {
          startTransition(async () => {
            try {
              await action(formData);
              toast.success("Changes saved");
            } catch {
              toast.error("Failed to save changes");
            }
          });
        }}
        className="space-y-6"
      >
        <input
          type="hidden"
          name="has_xrf"
          value={xrfChecked ? "true" : "false"}
        />
        <input
          type="hidden"
          name="has_dust_swab"
          value={dustSwabChecked ? "true" : "false"}
        />
        <input
          type="hidden"
          name="has_asbestos"
          value={asbestosChecked ? "true" : "false"}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent
            value="details"
            forceMount
            className="data-[state=inactive]:hidden space-y-4 pt-4"
          >
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
                      onCheckedChange={(checked) =>
                        setXrfChecked(checked === true)
                      }
                    />
                    <span className="text-sm">XRF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={dustSwabChecked}
                      onCheckedChange={(checked) =>
                        setDustSwabChecked(checked === true)
                      }
                    />
                    <span className="text-sm">Dust Swab</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={asbestosChecked}
                      onCheckedChange={(checked) =>
                        setAsbestosChecked(checked === true)
                      }
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
                  {job.estimated_end_time
                    ? formatTime12h(job.estimated_end_time)
                    : "\u2014"}
                </div>
                <input
                  type="hidden"
                  name="estimated_end_time"
                  value={job.estimated_end_time ?? ""}
                />
              </div>
            </div>

            {xrfChecked && (
              <div className="space-y-1.5">
                <Label htmlFor="num_units"># Units (total)</Label>
                <Input
                  id="num_units"
                  name="num_units"
                  type="number"
                  min="0"
                  defaultValue={job.num_units ?? ""}
                  className="max-w-xs"
                />
              </div>
            )}

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
          </TabsContent>

          <TabsContent
            value="pricing"
            forceMount
            className="data-[state=inactive]:hidden space-y-6 pt-4"
          >
            {xrfChecked && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">XRF Inspection</h3>
                <div className="rounded-md border">
                  <div className="grid grid-cols-[1fr_80px_100px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate</span>
                  </div>
                  <div className="divide-y">
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Studios & 1-Bed</span>
                      <Input
                        name="num_studios_1bed"
                        type="number"
                        min="0"
                        className="h-8 text-right text-sm"
                        defaultValue={job.num_studios_1bed ?? ""}
                      />
                      <Input
                        name="xrf_price_studios_1bed"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-sm"
                        defaultValue={defaultPriceStudios1Bed ?? ""}
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">2 & 3-Bed</span>
                      <Input
                        name="num_2_3bed"
                        type="number"
                        min="0"
                        className="h-8 text-right text-sm"
                        defaultValue={job.num_2_3bed ?? ""}
                      />
                      <Input
                        name="xrf_price_2_3bed"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-sm"
                        defaultValue={defaultPrice2_3Bed ?? ""}
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Common Spaces</span>
                      <Input
                        name="num_common_spaces"
                        type="number"
                        min="0"
                        className="h-8 text-right text-sm"
                        defaultValue={job.num_common_spaces ?? ""}
                      />
                      <Input
                        name="xrf_price_per_common_space"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-sm"
                        defaultValue={defaultPricePerCommonSpace ?? ""}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {dustSwabChecked && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Dust Swab Testing</h3>
                <div className="rounded-md border">
                  <div className="grid grid-cols-[1fr_80px_100px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate</span>
                  </div>
                  <div className="divide-y">
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Site Visit (EPA Certified)</span>
                      <span className="text-center text-sm text-muted-foreground">
                        —
                      </span>
                      <Input
                        name="dust_swab_site_visit_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-sm"
                        defaultValue={defaultDustSwabSiteVisitRate ?? ""}
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Project Mgmt & Report</span>
                      <span className="text-center text-sm text-muted-foreground">
                        —
                      </span>
                      <Input
                        name="dust_swab_proj_mgmt_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-sm"
                        defaultValue={defaultDustSwabProjMgmtRate ?? ""}
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Lead Dust Wipes</span>
                      <Input
                        name="num_wipes"
                        type="number"
                        min="0"
                        className="h-8 text-right text-sm"
                        defaultValue={job.num_wipes ?? ""}
                      />
                      <Input
                        name="wipe_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-sm"
                        defaultValue={defaultWipeRate ?? ""}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {asbestosChecked && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Asbestos Inspection</h3>
                <div className="rounded-md border">
                  <div className="grid grid-cols-[1fr_80px_100px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate</span>
                  </div>
                  <div className="divide-y">
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Site Visit</span>
                      <span className="text-center text-sm text-muted-foreground">
                        —
                      </span>
                      <Input
                        name="asbestos_site_visit_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-sm"
                        defaultValue={defaultAsbestosSiteVisitRate ?? ""}
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Samples</span>
                      <Input
                        name="num_asbestos_samples"
                        type="number"
                        min="0"
                        className="h-8 text-right text-sm"
                        defaultValue={job.num_asbestos_samples ?? ""}
                      />
                      <Input
                        name="asbestos_sample_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-right text-sm"
                        defaultValue={defaultAsbestosSampleRate ?? ""}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!xrfChecked && !dustSwabChecked && !asbestosChecked && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No services selected. Enable services in the Details tab to
                configure pricing.
              </p>
            )}

            {(xrfChecked || dustSwabChecked || asbestosChecked) && (
              <>
                <Separator />

                <div className="space-y-3 text-sm max-w-sm">
                  <h3 className="text-sm font-medium">Summary</h3>

                  {pricingSummary.xrfSubtotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">XRF</span>
                      <span>
                        {formatCurrency(pricingSummary.xrfSubtotal)}
                      </span>
                    </div>
                  )}
                  {pricingSummary.dustSwabSubtotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dust Swab</span>
                      <span>
                        {formatCurrency(pricingSummary.dustSwabSubtotal)}
                      </span>
                    </div>
                  )}
                  {pricingSummary.asbestosSubtotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Asbestos</span>
                      <span>
                        {formatCurrency(pricingSummary.asbestosSubtotal)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(pricingSummary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (8.88%)</span>
                    <span>{formatCurrency(pricingSummary.tax)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>{formatCurrency(pricingSummary.total)}</span>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent
            value="reports"
            forceMount
            className="data-[state=inactive]:hidden space-y-4 pt-4"
          >
            {(xrfChecked || dustSwabChecked || asbestosChecked) && (
              <div className="grid grid-cols-2 gap-4">
                {xrfChecked && (
                  <div className="space-y-1.5">
                    <Label htmlFor="report_status">XRF Report Status</Label>
                    <Select
                      name="report_status"
                      defaultValue={job.report_status}
                    >
                      <SelectTrigger id="report_status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(xrfStatusLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {dustSwabChecked && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dust_swab_status">Dust Swab Status</Label>
                    <Select
                      name="dust_swab_status"
                      defaultValue={job.dust_swab_status ?? "not_started"}
                    >
                      <SelectTrigger id="dust_swab_status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(dustSwabStatusLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {asbestosChecked && (
                  <div className="space-y-1.5">
                    <Label htmlFor="asbestos_status">Asbestos Status</Label>
                    <Select
                      name="asbestos_status"
                      defaultValue={job.asbestos_status ?? "not_started"}
                    >
                      <SelectTrigger id="asbestos_status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(asbestosStatusLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {!xrfChecked && (
              <input
                type="hidden"
                name="report_status"
                value={job.report_status}
              />
            )}
            {!dustSwabChecked && (
              <input
                type="hidden"
                name="dust_swab_status"
                value={job.dust_swab_status ?? "not_started"}
              />
            )}
            {!asbestosChecked && (
              <input
                type="hidden"
                name="asbestos_status"
                value={job.asbestos_status ?? "not_started"}
              />
            )}

            {!xrfChecked && !dustSwabChecked && !asbestosChecked && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No services selected. Enable services in the Details tab to
                manage reports.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {activeTab === "reports" &&
        (xrfChecked || dustSwabChecked || asbestosChecked) && (
          <div className="space-y-6">
            {xrfChecked && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    XRF Reports
                    {expectedCounts.xrf > 0
                      ? ` (${xrfReports.length} of ${expectedCounts.xrf} uploaded)`
                      : ` (${xrfReports.length} uploaded)`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {xrfReports.length > 0 ? (
                    <ul className="space-y-1.5">
                      {xrfReports.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {fileIcon}
                          <a
                            href={`/api/reports/${r.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            {r.original_filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No XRF reports uploaded yet.
                    </p>
                  )}
                  <form action={uploadActions.xrf}>
                    <div className="flex items-center gap-3">
                      <Input
                        name="file"
                        type="file"
                        accept=".pdf,.doc,.docx"
                      />
                      <Button type="submit" variant="outline" size="sm">
                        Upload
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {dustSwabChecked && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Dust Swab Reports
                    {expectedCounts.dustSwab > 0
                      ? ` (${dustSwabReports.length} of ${expectedCounts.dustSwab} uploaded)`
                      : ` (${dustSwabReports.length} uploaded)`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dustSwabReports.length > 0 ? (
                    <ul className="space-y-1.5">
                      {dustSwabReports.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {fileIcon}
                          <a
                            href={`/api/reports/${r.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            {r.original_filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No dust swab reports uploaded yet.
                    </p>
                  )}
                  <form action={uploadActions.dustSwab}>
                    <div className="flex items-center gap-3">
                      <Input
                        name="file"
                        type="file"
                        accept=".pdf,.doc,.docx"
                      />
                      <Button type="submit" variant="outline" size="sm">
                        Upload
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {asbestosChecked && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Asbestos Reports
                    {expectedCounts.asbestos > 0
                      ? ` (${asbestosReports.length} of ${expectedCounts.asbestos} uploaded)`
                      : ` (${asbestosReports.length} uploaded)`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {asbestosReports.length > 0 ? (
                    <ul className="space-y-1.5">
                      {asbestosReports.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {fileIcon}
                          <a
                            href={`/api/reports/${r.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            {r.original_filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No asbestos reports uploaded yet.
                    </p>
                  )}
                  <form action={uploadActions.asbestos}>
                    <div className="flex items-center gap-3">
                      <Input
                        name="file"
                        type="file"
                        accept=".pdf,.doc,.docx"
                      />
                      <Button type="submit" variant="outline" size="sm">
                        Upload
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}
    </>
  );
}
