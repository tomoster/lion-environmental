"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
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

type Property = {
  id: string;
  building_address: string | null;
  has_xrf: boolean;
  has_dust_swab: boolean;
  has_asbestos: boolean;
  scan_date: string | null;
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
  xrf_price_studios_1bed: number | null;
  xrf_price_2_3bed: number | null;
  xrf_price_per_common_space: number | null;
  report_status: string;
  dust_swab_status: string | null;
  asbestos_status: string | null;
  report_writer_id: string | null;
  worker_id: string | null;
  property_status: string;
  workerData: { id: string; name: string } | null;
  availability: {
    available: { id: string; name: string }[];
    unavailable: { worker: { id: string; name: string }; reason: string }[];
  };
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
};

type JobDetailFormProps = {
  updateJobAction: (formData: FormData) => Promise<void>;
  createPropertyAction: (formData: FormData) => Promise<void>;
  job: {
    client_company: string | null;
    client_contact: string | null;
    client_email: string | null;
    client_phone: string | null;
    notes: string | null;
  };
  properties: Property[];
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
  propertyPricings: {
    xrfSubtotal: number;
    dustSwabSubtotal: number;
    asbestosSubtotal: number;
    subtotal: number;
    tax: number;
    total: number;
  }[];
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
  defaultPrices: {
    priceStudios1Bed: number | null;
    price2_3Bed: number | null;
    pricePerCommonSpace: number | null;
    wipeRate: number | null;
    dustSwabSiteVisitRate: number | null;
    dustSwabProjMgmtRate: number | null;
    asbestosSampleRate: number | null;
    asbestosSiteVisitRate: number | null;
  };
};

export function JobDetailForm({
  updateJobAction,
  createPropertyAction,
  job,
  properties,
  officeWorkers,
  xrfStatusLabels,
  dustSwabStatusLabels,
  asbestosStatusLabels,
  pricingSummary,
  propertyPricings,
  uploadActions,
  jobReports,
  defaultPrices,
}: JobDetailFormProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("details");
  const [showAddProperty, setShowAddProperty] = useState(false);

  const anyHasXrf = properties.some((p) => p.has_xrf);
  const anyHasDustSwab = properties.some((p) => p.has_dust_swab);
  const anyHasAsbestos = properties.some((p) => p.has_asbestos);

  const xrfReports = jobReports.filter((r) => r.report_type === "xrf");
  const dustSwabReports = jobReports.filter((r) => r.report_type === "dust_swab");
  const asbestosReports = jobReports.filter((r) => r.report_type === "asbestos");

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="properties">
            Properties ({properties.length})
          </TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ---- DETAILS TAB: Company Info ---- */}
        <TabsContent value="details" className="space-y-4 pt-4">
          <CompanyInfoForm
            job={job}
            action={updateJobAction}
            isPending={isPending}
            startTransition={startTransition}
          />
        </TabsContent>

        {/* ---- PROPERTIES TAB ---- */}
        <TabsContent value="properties" className="space-y-4 pt-4">
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No properties yet. Add a property to get started.
            </p>
          ) : (
            properties.map((prop, idx) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                index={idx}
                officeWorkers={officeWorkers}
                xrfStatusLabels={xrfStatusLabels}
                dustSwabStatusLabels={dustSwabStatusLabels}
                asbestosStatusLabels={asbestosStatusLabels}
                defaultPrices={defaultPrices}
                pricing={propertyPricings[idx]}
                canDelete={properties.length > 1}
              />
            ))
          )}

          {showAddProperty ? (
            <AddPropertyForm
              action={createPropertyAction}
              onCancel={() => setShowAddProperty(false)}
            />
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAddProperty(true)}
              className="w-full"
            >
              + Add Property
            </Button>
          )}
        </TabsContent>

        {/* ---- PRICING TAB: Aggregate ---- */}
        <TabsContent value="pricing" className="space-y-6 pt-4">
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No properties yet. Add properties to see pricing.
            </p>
          ) : (
            <>
              {properties.length > 1 && (
                <div className="space-y-3">
                  {properties.map((prop, idx) => {
                    const pp = propertyPricings[idx];
                    if (pp.subtotal === 0) return null;
                    return (
                      <div key={prop.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {prop.building_address ?? `Property ${idx + 1}`}
                        </span>
                        <span>{formatCurrency(pp.total)}</span>
                      </div>
                    );
                  })}
                  <Separator />
                </div>
              )}

              <div className="space-y-3 text-sm max-w-sm">
                <h3 className="text-sm font-medium">Total Summary</h3>

                {pricingSummary.xrfSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">XRF</span>
                    <span>{formatCurrency(pricingSummary.xrfSubtotal)}</span>
                  </div>
                )}
                {pricingSummary.dustSwabSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dust Swab</span>
                    <span>{formatCurrency(pricingSummary.dustSwabSubtotal)}</span>
                  </div>
                )}
                {pricingSummary.asbestosSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Asbestos</span>
                    <span>{formatCurrency(pricingSummary.asbestosSubtotal)}</span>
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

        {/* ---- REPORTS TAB ---- */}
        <TabsContent value="reports" className="space-y-4 pt-4">
          {!anyHasXrf && !anyHasDustSwab && !anyHasAsbestos ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No services selected on any property. Enable services to manage reports.
            </p>
          ) : (
            <div className="space-y-6">
              {anyHasXrf && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      XRF Reports ({xrfReports.length} uploaded)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {xrfReports.length > 0 ? (
                      <ul className="space-y-1.5">
                        {xrfReports.map((r) => (
                          <li key={r.id} className="flex items-center gap-2 text-sm">
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
                      <p className="text-sm text-muted-foreground">No XRF reports uploaded yet.</p>
                    )}
                    <form action={uploadActions.xrf}>
                      <div className="flex items-center gap-3">
                        <Input name="file" type="file" accept=".pdf,.doc,.docx" />
                        <Button type="submit" variant="outline" size="sm">Upload</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {anyHasDustSwab && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Dust Swab Reports ({dustSwabReports.length} uploaded)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dustSwabReports.length > 0 ? (
                      <ul className="space-y-1.5">
                        {dustSwabReports.map((r) => (
                          <li key={r.id} className="flex items-center gap-2 text-sm">
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
                      <p className="text-sm text-muted-foreground">No dust swab reports uploaded yet.</p>
                    )}
                    <form action={uploadActions.dustSwab}>
                      <div className="flex items-center gap-3">
                        <Input name="file" type="file" accept=".pdf,.doc,.docx" />
                        <Button type="submit" variant="outline" size="sm">Upload</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {anyHasAsbestos && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Asbestos Reports ({asbestosReports.length} uploaded)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {asbestosReports.length > 0 ? (
                      <ul className="space-y-1.5">
                        {asbestosReports.map((r) => (
                          <li key={r.id} className="flex items-center gap-2 text-sm">
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
                      <p className="text-sm text-muted-foreground">No asbestos reports uploaded yet.</p>
                    )}
                    <form action={uploadActions.asbestos}>
                      <div className="flex items-center gap-3">
                        <Input name="file" type="file" accept=".pdf,.doc,.docx" />
                        <Button type="submit" variant="outline" size="sm">Upload</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function CompanyInfoForm({
  job,
  action,
  isPending,
  startTransition,
}: {
  job: {
    client_company: string | null;
    client_contact: string | null;
    client_email: string | null;
    client_phone: string | null;
    notes: string | null;
  };
  action: (formData: FormData) => Promise<void>;
  isPending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
}) {
  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          try {
            await action(formData);
            toast.success("Company info saved");
          } catch {
            toast.error("Failed to save");
          }
        });
      }}
      className="space-y-4"
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
          <Label htmlFor="client_contact">Contact</Label>
          <Input
            id="client_contact"
            name="client_contact"
            defaultValue={job.client_contact ?? ""}
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
        <div className="space-y-1.5">
          <Label htmlFor="client_phone">Phone</Label>
          <Input
            id="client_phone"
            name="client_phone"
            type="tel"
            defaultValue={job.client_phone ?? ""}
          />
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

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Company Info"}
        </Button>
      </div>
    </form>
  );
}

function PropertyCard({
  property: prop,
  index,
  officeWorkers,
  xrfStatusLabels,
  dustSwabStatusLabels,
  asbestosStatusLabels,
  defaultPrices,
  pricing,
  canDelete,
}: {
  property: Property;
  index: number;
  officeWorkers: { id: string; name: string }[];
  xrfStatusLabels: Record<string, string>;
  dustSwabStatusLabels: Record<string, string>;
  asbestosStatusLabels: Record<string, string>;
  defaultPrices: {
    priceStudios1Bed: number | null;
    price2_3Bed: number | null;
    pricePerCommonSpace: number | null;
    wipeRate: number | null;
    dustSwabSiteVisitRate: number | null;
    dustSwabProjMgmtRate: number | null;
    asbestosSampleRate: number | null;
    asbestosSiteVisitRate: number | null;
  };
  pricing: {
    xrfSubtotal: number;
    dustSwabSubtotal: number;
    asbestosSubtotal: number;
    subtotal: number;
    tax: number;
    total: number;
  };
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [xrfChecked, setXrfChecked] = useState(prop.has_xrf);
  const [dustSwabChecked, setDustSwabChecked] = useState(prop.has_dust_swab);
  const [asbestosChecked, setAsbestosChecked] = useState(prop.has_asbestos);
  const router = useRouter();

  const serviceTypes: string[] = [];
  if (prop.has_xrf) serviceTypes.push("XRF");
  if (prop.has_dust_swab) serviceTypes.push("Dust Swab");
  if (prop.has_asbestos) serviceTypes.push("Asbestos");

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {prop.building_address ?? `Property ${index + 1}`}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {serviceTypes.length > 0 ? serviceTypes.join(" + ") : "No services"}
              {prop.scan_date && (
                <>
                  <span>|</span>
                  <span>
                    {new Date(prop.scan_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </>
              )}
              {prop.workerData && (
                <>
                  <span>|</span>
                  <span>{prop.workerData.name}</span>
                </>
              )}
              {pricing.total > 0 && (
                <>
                  <span>|</span>
                  <span>{formatCurrency(pricing.total)}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prop.has_xrf && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                XRF: {xrfStatusLabels[prop.report_status] ?? prop.report_status}
              </Badge>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          <form
            action={(formData) => {
              startTransition(async () => {
                try {
                  await prop.updateAction(formData);
                  toast.success("Property saved");
                  router.refresh();
                } catch {
                  toast.error("Failed to save property");
                }
              });
            }}
            className="space-y-4"
          >
            <input type="hidden" name="has_xrf" value={xrfChecked ? "true" : "false"} />
            <input type="hidden" name="has_dust_swab" value={dustSwabChecked ? "true" : "false"} />
            <input type="hidden" name="has_asbestos" value={asbestosChecked ? "true" : "false"} />

            <div className="space-y-1.5">
              <Label>Building Address</Label>
              <Input name="building_address" defaultValue={prop.building_address ?? ""} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Scan Date</Label>
                <Input name="scan_date" type="date" defaultValue={prop.scan_date ?? ""} />
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
                <Label>Start Time</Label>
                <TimeInput name="start_time" defaultValue={prop.start_time ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Est. End Time</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                  {prop.estimated_end_time ? formatTime12h(prop.estimated_end_time) : "\u2014"}
                </div>
                <input type="hidden" name="estimated_end_time" value={prop.estimated_end_time ?? ""} />
              </div>
            </div>

            {xrfChecked && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">XRF Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label># Units (total)</Label>
                    <Input name="num_units" type="number" min="0" defaultValue={prop.num_units ?? ""} className="max-w-xs" />
                  </div>
                </div>
                <div className="rounded-md border">
                  <div className="grid grid-cols-[1fr_80px_100px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate</span>
                  </div>
                  <div className="divide-y">
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Studios & 1-Bed</span>
                      <Input name="num_studios_1bed" type="number" min="0" className="h-8 text-right text-sm" defaultValue={prop.num_studios_1bed ?? ""} />
                      <Input name="xrf_price_studios_1bed" type="number" min="0" step="0.01" className="h-8 text-right text-sm" defaultValue={prop.xrf_price_studios_1bed ?? defaultPrices.priceStudios1Bed ?? ""} />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">2 & 3-Bed</span>
                      <Input name="num_2_3bed" type="number" min="0" className="h-8 text-right text-sm" defaultValue={prop.num_2_3bed ?? ""} />
                      <Input name="xrf_price_2_3bed" type="number" min="0" step="0.01" className="h-8 text-right text-sm" defaultValue={prop.xrf_price_2_3bed ?? defaultPrices.price2_3Bed ?? ""} />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Common Spaces</span>
                      <Input name="num_common_spaces" type="number" min="0" className="h-8 text-right text-sm" defaultValue={prop.num_common_spaces ?? ""} />
                      <Input name="xrf_price_per_common_space" type="number" min="0" step="0.01" className="h-8 text-right text-sm" defaultValue={prop.xrf_price_per_common_space ?? defaultPrices.pricePerCommonSpace ?? ""} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {dustSwabChecked && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Dust Swab Details</h4>
                <div className="rounded-md border">
                  <div className="grid grid-cols-[1fr_80px_100px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate</span>
                  </div>
                  <div className="divide-y">
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Site Visit (EPA Certified)</span>
                      <span className="text-center text-sm text-muted-foreground">-</span>
                      <Input name="dust_swab_site_visit_rate" type="number" min="0" step="0.01" className="h-8 text-right text-sm" defaultValue={prop.dust_swab_site_visit_rate ?? defaultPrices.dustSwabSiteVisitRate ?? ""} />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Project Mgmt & Report</span>
                      <span className="text-center text-sm text-muted-foreground">-</span>
                      <Input name="dust_swab_proj_mgmt_rate" type="number" min="0" step="0.01" className="h-8 text-right text-sm" defaultValue={prop.dust_swab_proj_mgmt_rate ?? defaultPrices.dustSwabProjMgmtRate ?? ""} />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Lead Dust Wipes</span>
                      <Input name="num_wipes" type="number" min="0" className="h-8 text-right text-sm" defaultValue={prop.num_wipes ?? ""} />
                      <Input name="wipe_rate" type="number" min="0" step="0.01" className="h-8 text-right text-sm" defaultValue={prop.wipe_rate ?? defaultPrices.wipeRate ?? ""} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {asbestosChecked && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Asbestos Details</h4>
                <div className="rounded-md border">
                  <div className="grid grid-cols-[1fr_80px_100px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate</span>
                  </div>
                  <div className="divide-y">
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Site Visit</span>
                      <span className="text-center text-sm text-muted-foreground">-</span>
                      <Input name="asbestos_site_visit_rate" type="number" min="0" step="0.01" className="h-8 text-right text-sm" defaultValue={prop.asbestos_site_visit_rate ?? defaultPrices.asbestosSiteVisitRate ?? ""} />
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-2 px-3 py-2">
                      <span className="text-sm">Samples</span>
                      <Input name="num_asbestos_samples" type="number" min="0" className="h-8 text-right text-sm" defaultValue={prop.num_asbestos_samples ?? ""} />
                      <Input name="asbestos_sample_rate" type="number" min="0" step="0.01" className="h-8 text-right text-sm" defaultValue={prop.asbestos_sample_rate ?? defaultPrices.asbestosSampleRate ?? ""} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Assigned Worker</Label>
                <Select name="worker_id" defaultValue={prop.workerData?.id ?? "unassigned"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {prop.availability.available.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                    {prop.availability.unavailable.map(({ worker: w, reason }) => (
                      <SelectItem key={w.id} value={w.id} disabled>{w.name} - {reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Report Writer</Label>
                <Select name="report_writer_id" defaultValue={prop.report_writer_id ?? "unassigned"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {officeWorkers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(xrfChecked || dustSwabChecked || asbestosChecked) && (
              <div className="grid grid-cols-2 gap-4">
                {xrfChecked && (
                  <div className="space-y-1.5">
                    <Label>XRF Report Status</Label>
                    <Select name="report_status" defaultValue={prop.report_status}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(xrfStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {dustSwabChecked && (
                  <div className="space-y-1.5">
                    <Label>Dust Swab Status</Label>
                    <Select name="dust_swab_status" defaultValue={prop.dust_swab_status ?? "not_started"}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(dustSwabStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {asbestosChecked && (
                  <div className="space-y-1.5">
                    <Label>Asbestos Status</Label>
                    <Select name="asbestos_status" defaultValue={prop.asbestos_status ?? "not_started"}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(asbestosStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {!xrfChecked && <input type="hidden" name="report_status" value={prop.report_status} />}
            {!dustSwabChecked && <input type="hidden" name="dust_swab_status" value={prop.dust_swab_status ?? "not_started"} />}
            {!asbestosChecked && <input type="hidden" name="asbestos_status" value={prop.asbestos_status ?? "not_started"} />}

            <div className="flex items-center justify-between pt-2">
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={isDeleting}
                  onClick={() => {
                    if (!confirm("Delete this property?")) return;
                    startDeleteTransition(async () => {
                      try {
                        await prop.deleteAction();
                        toast.success("Property deleted");
                        router.refresh();
                      } catch {
                        toast.error("Failed to delete");
                      }
                    });
                  }}
                >
                  {isDeleting ? "Deleting..." : "Delete Property"}
                </Button>
              ) : (
                <div />
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Property"}
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}

function AddPropertyForm({
  action,
  onCancel,
}: {
  action: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [xrfChecked, setXrfChecked] = useState(true);
  const [dustSwabChecked, setDustSwabChecked] = useState(false);
  const [asbestosChecked, setAsbestosChecked] = useState(false);
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Property</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) => {
            startTransition(async () => {
              try {
                await action(formData);
                toast.success("Property added");
                onCancel();
                router.refresh();
              } catch {
                toast.error("Failed to add property");
              }
            });
          }}
          className="space-y-4"
        >
          <input type="hidden" name="has_xrf" value={xrfChecked ? "true" : "false"} />
          <input type="hidden" name="has_dust_swab" value={dustSwabChecked ? "true" : "false"} />
          <input type="hidden" name="has_asbestos" value={asbestosChecked ? "true" : "false"} />

          <div className="space-y-1.5">
            <Label>Building Address</Label>
            <Input name="building_address" placeholder="123 Main St, New York, NY" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Scan Date</Label>
              <Input name="scan_date" type="date" />
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

          {xrfChecked && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label># Units (total)</Label>
                <Input name="num_units" type="number" min="0" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Common Spaces</Label>
                <Input name="num_common_spaces" type="number" min="0" placeholder="0" />
              </div>
            </div>
          )}

          {dustSwabChecked && (
            <div className="space-y-1.5">
              <Label>Number of Wipes</Label>
              <Input name="num_wipes" type="number" min="0" placeholder="0" className="max-w-xs" />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Property"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
