"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { updateSettings } from "./actions";

const DEFAULT_INVOICE_SUBJECT =
  "Invoice #{{invoice_number}} from Lion Environmental LLC";

const DEFAULT_INVOICE_BODY = `Dear {{company}},

Please find attached your invoice. All payment details are included in the PDF.

If you have any questions, please don't hesitate to reach out.

Thank you for your business!`;

const DEFAULT_REPORT_SUBJECT = "{{service_type}} Report - {{address}}";

const DEFAULT_REPORT_BODY = `Dear {{company}},

Please find attached the {{service_type}} report for the property at {{address}}.

If you have any questions about this report, please don't hesitate to reach out.

Thank you for choosing Lion Environmental!`;

const DEFAULT_PROPOSAL_SUBJECT = "Proposal — {{address}}";

const DEFAULT_PROPOSAL_BODY = `Hi,

Thank you for reaching out. Please find attached our proposal for {{address}}.

Once you've had a chance to review, let us know a good time to schedule the work. We're looking forward to working with you!`;

const DEFAULT_COLD_EMAIL_SUBJECT_NYC = "Quick question, {{first_name}}";
const DEFAULT_COLD_EMAIL_SUBJECT_ROCKLAND = "Quick question, {{first_name}}";

const DEFAULT_COLD_EMAIL_STEPS_NYC = [
  `Hi {{first_name}},

Local Law 31 deadlines are putting a lot of pressure on NYC property managers right now - buildings need to be inspected or fines start at $1,000 per unit.

We do full-building XRF inspections with certified reports ready in 48-72 hours.

Worth a quick conversation about your portfolio?`,

  `Hi {{first_name}},

Following up on my last note. NYC enforcement on Local Law 31 is picking up - violations are being issued and fines start at $1,000 per unit.

We handle full-building inspections with certified reports, typically in 2-3 days. Happy to put together a quick quote if you want to see numbers.

Worth it?`,

  `Hi {{first_name}},

Just wrapped up a 24-unit inspection in Jersey City - certified report delivered in 2 days, owner submitted for compliance the same week.

If your buildings still need to be checked off, happy to put together a quote. Faster turnaround than most.

Worth a look?`,

  `Hi {{first_name}},

No worries if the timing isn't right. If lead paint testing or Local Law 31 compliance comes up down the road, feel free to reach out anytime.`,
];

const DEFAULT_COLD_EMAIL_STEPS_ROCKLAND = [
  `Hi {{first_name}},

New York State requires lead paint inspections for pre-1980 rental properties - and Rockland County's remediation grant covers up to $40,000 per unit for landlords who get inspected first.

We do full-building XRF inspections with certified reports in 48-72 hours.

Worth a quick conversation about your properties?`,

  `Hi {{first_name}},

Following up on my last note. With most Rockland County rentals built before 1978, the state inspection requirement applies to almost every multi-family portfolio in the area.

The county grant ($40K per unit) requires an inspection first - worth getting ahead of it.

Happy to put together a quick quote.`,

  `Hi {{first_name}},

Just finished a property in New City - owner is applying for the Rockland County remediation grant this month. The inspection report is the first thing they ask for.

If you've been sitting on this, happy to get you a quote this week.

Worth it?`,

  `Hi {{first_name}},

No worries if the timing isn't right. If lead paint inspections or the Rockland County remediation grants ever come up, feel free to reach out anytime.`,
];

const DEFAULT_COLD_EMAIL_SIGNATURE = `Avi Bursztyn
Lion Environmental LLC
(201) 375-2797`;

interface SettingsFormProps {
  settings: Record<string, string>;
}

function useSettingsSubmit(successMessage: string) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(successMessage);
      }
    });
  }
  return { isPending, handleSubmit };
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [emailLocation, setEmailLocation] = useState<"nyc" | "rockland">("nyc");

  const biz = useSettingsSubmit("Business information saved.");
  const xrf = useSettingsSubmit("XRF scanning settings saved.");
  const dustSwab = useSettingsSubmit("Dust swab settings saved.");
  const asbestos = useSettingsSubmit("Asbestos testing settings saved.");
  const proposalTpl = useSettingsSubmit("Proposal email template saved.");
  const invoiceTpl = useSettingsSubmit("Invoice email template saved.");
  const reportTpl = useSettingsSubmit("Report email template saved.");
  const coldEmail = useSettingsSubmit("Cold email templates saved.");

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>

      {/* ─── General ─── */}
      <TabsContent value="general" className="space-y-6">
        <form onSubmit={biz.handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Used on invoices, emails, and reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    name="business_name"
                    defaultValue={settings.business_name ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sender_name">Sender Name</Label>
                  <Input
                    id="sender_name"
                    name="sender_name"
                    defaultValue={settings.sender_name ?? ""}
                    placeholder="Name shown on outgoing emails"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_email">Business Email</Label>
                  <Input
                    id="business_email"
                    name="business_email"
                    type="email"
                    defaultValue={settings.business_email ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_phone">Business Phone</Label>
                  <Input
                    id="business_phone"
                    name="business_phone"
                    type="tel"
                    defaultValue={settings.business_phone ?? ""}
                    placeholder="(###) ###-####"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_zelle">Zelle Number</Label>
                  <Input
                    id="business_zelle"
                    name="business_zelle"
                    defaultValue={settings.business_zelle ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_check_address">
                    Check / Mail Address
                  </Label>
                  <Input
                    id="business_check_address"
                    name="business_check_address"
                    defaultValue={settings.business_check_address ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tax_rate">Tax Rate</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="tax_rate"
                      name="tax_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-32"
                      defaultValue={settings.tax_rate ?? ""}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applies to all invoices.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={biz.isPending}>
                {biz.isPending ? "Saving..." : "Save Business Information"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </TabsContent>

      {/* ─── Pricing ─── */}
      <TabsContent value="pricing" className="space-y-6">
        <form onSubmit={xrf.handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>XRF Scanning</CardTitle>
              <CardDescription>
                Default pricing and duration estimates for XRF scanning jobs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="xrf_price_studios_1bed">Price / Studio & 1-Bed ($)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="xrf_price_studios_1bed"
                      name="xrf_price_studios_1bed"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={settings.xrf_price_studios_1bed ?? "150"}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="xrf_price_2_3bed">Price / 2-3 Bed ($)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="xrf_price_2_3bed"
                      name="xrf_price_2_3bed"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={settings.xrf_price_2_3bed ?? "165"}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="xrf_price_per_common_space">Price / Common Space ($)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="xrf_price_per_common_space"
                      name="xrf_price_per_common_space"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={settings.xrf_price_per_common_space ?? "110"}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="xrf_duration_per_unit">Minutes / Unit</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="xrf_duration_per_unit"
                      name="xrf_duration_per_unit"
                      type="number"
                      min="1"
                      defaultValue={settings.xrf_duration_per_unit ?? "45"}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="xrf_duration_per_common_space">Minutes / Common Space</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="xrf_duration_per_common_space"
                      name="xrf_duration_per_common_space"
                      type="number"
                      min="1"
                      defaultValue={settings.xrf_duration_per_common_space ?? "30"}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={xrf.isPending}>
                {xrf.isPending ? "Saving..." : "Save XRF Settings"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form onSubmit={dustSwab.handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dust Swab</CardTitle>
              <CardDescription>
                Default pricing and duration estimates for dust swab jobs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dust_swab_site_visit_rate">Site Visit ($)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="dust_swab_site_visit_rate"
                      name="dust_swab_site_visit_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={settings.dust_swab_site_visit_rate ?? ""}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dust_swab_proj_mgmt_rate">Report ($)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="dust_swab_proj_mgmt_rate"
                      name="dust_swab_proj_mgmt_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={settings.dust_swab_proj_mgmt_rate ?? ""}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dust_swab_wipe_rate">Wipe Rate ($/wipe)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="dust_swab_wipe_rate"
                      name="dust_swab_wipe_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={settings.dust_swab_wipe_rate ?? ""}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      / wipe
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dust_swab_duration">Duration (min)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="dust_swab_duration"
                    name="dust_swab_duration"
                    type="number"
                    min="1"
                    className="w-32"
                    defaultValue={settings.dust_swab_duration ?? "90"}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={dustSwab.isPending}>
                {dustSwab.isPending ? "Saving..." : "Save Dust Swab Settings"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form onSubmit={asbestos.handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Asbestos Testing</CardTitle>
              <CardDescription>
                Default pricing and duration estimates for asbestos testing jobs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="asbestos_site_visit_rate">Site Visit ($)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="asbestos_site_visit_rate"
                      name="asbestos_site_visit_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={settings.asbestos_site_visit_rate ?? ""}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="asbestos_sample_rate">Sample Rate ($/sample)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="asbestos_sample_rate"
                      name="asbestos_sample_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={settings.asbestos_sample_rate ?? ""}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      / sample
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asbestos_duration">Duration (min)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="asbestos_duration"
                    name="asbestos_duration"
                    type="number"
                    min="1"
                    className="w-32"
                    defaultValue={settings.asbestos_duration ?? "60"}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={asbestos.isPending}>
                {asbestos.isPending ? "Saving..." : "Save Asbestos Settings"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </TabsContent>

      {/* ─── Email ─── */}
      <TabsContent value="email">
        <Tabs defaultValue="proposal">
          <TabsList variant="line">
            <TabsTrigger value="proposal">Proposal</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="cold-email">Cold Email</TabsTrigger>
          </TabsList>

          <TabsContent value="proposal" className="pt-4">
            <form onSubmit={proposalTpl.handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Email</CardTitle>
                  <CardDescription>
                    Sent when a proposal is emailed. Variables:{" "}
                    <code className="text-xs">{"{{address}}"}</code>,{" "}
                    <code className="text-xs">{"{{job_number}}"}</code>,{" "}
                    <code className="text-xs">{"{{company}}"}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="proposal_email_subject">Subject Line</Label>
                    <Input
                      id="proposal_email_subject"
                      name="proposal_email_subject"
                      defaultValue={
                        settings.proposal_email_subject ?? DEFAULT_PROPOSAL_SUBJECT
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="proposal_email_body">Body</Label>
                    <Textarea
                      id="proposal_email_body"
                      name="proposal_email_body"
                      rows={8}
                      defaultValue={
                        settings.proposal_email_body ?? DEFAULT_PROPOSAL_BODY
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Proposal PDFs are attached automatically. Signature is added below.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={proposalTpl.isPending}>
                    {proposalTpl.isPending ? "Saving..." : "Save Proposal Template"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="invoice" className="pt-4">
            <form onSubmit={invoiceTpl.handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Email</CardTitle>
                  <CardDescription>
                    Sent when an invoice is emailed. Variables:{" "}
                    <code className="text-xs">{"{{invoice_number}}"}</code>,{" "}
                    <code className="text-xs">{"{{company}}"}</code>,{" "}
                    <code className="text-xs">{"{{amount}}"}</code>,{" "}
                    <code className="text-xs">{"{{due_date}}"}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invoice_email_subject">Subject Line</Label>
                    <Input
                      id="invoice_email_subject"
                      name="invoice_email_subject"
                      defaultValue={
                        settings.invoice_email_subject ?? DEFAULT_INVOICE_SUBJECT
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invoice_email_body">Body</Label>
                    <Textarea
                      id="invoice_email_body"
                      name="invoice_email_body"
                      rows={6}
                      defaultValue={
                        settings.invoice_email_body ?? DEFAULT_INVOICE_BODY
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Invoice PDF is attached automatically. Signature is added below.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={invoiceTpl.isPending}>
                    {invoiceTpl.isPending ? "Saving..." : "Save Invoice Template"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="report" className="pt-4">
            <form onSubmit={reportTpl.handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Report Email</CardTitle>
                  <CardDescription>
                    Sent when a report is emailed. Variables:{" "}
                    <code className="text-xs">{"{{job_number}}"}</code>,{" "}
                    <code className="text-xs">{"{{company}}"}</code>,{" "}
                    <code className="text-xs">{"{{address}}"}</code>,{" "}
                    <code className="text-xs">{"{{service_type}}"}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="report_email_subject">Subject Line</Label>
                    <Input
                      id="report_email_subject"
                      name="report_email_subject"
                      defaultValue={
                        settings.report_email_subject ?? DEFAULT_REPORT_SUBJECT
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="report_email_body">Body</Label>
                    <Textarea
                      id="report_email_body"
                      name="report_email_body"
                      rows={8}
                      defaultValue={
                        settings.report_email_body ?? DEFAULT_REPORT_BODY
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Report PDFs are attached automatically. Signature is added below.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={reportTpl.isPending}>
                    {reportTpl.isPending ? "Saving..." : "Save Report Template"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="cold-email" className="pt-4">
            <form onSubmit={coldEmail.handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Cold Email Sequence</CardTitle>
                  <CardDescription>
                    4-step outreach sequence. Templates auto-selected based on
                    prospect location. Variables:{" "}
                    <code className="text-xs">{"{{company}}"}</code>,{" "}
                    <code className="text-xs">{"{{first_name}}"}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cold_email_signature">Signature</Label>
                    <Textarea
                      id="cold_email_signature"
                      name="cold_email_signature"
                      rows={3}
                      defaultValue={
                        settings.cold_email_signature ?? DEFAULT_COLD_EMAIL_SIGNATURE
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Appended automatically to every cold email step.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEmailLocation("nyc")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        emailLocation === "nyc"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      NYC / Default
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailLocation("rockland")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        emailLocation === "rockland"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Rockland County
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`cold_email_subject_${emailLocation}`}>
                      Subject Line
                    </Label>
                    <Input
                      key={`subject_${emailLocation}`}
                      id={`cold_email_subject_${emailLocation}`}
                      name={`cold_email_subject_${emailLocation}`}
                      defaultValue={
                        settings[`cold_email_subject_${emailLocation}`] ??
                        (emailLocation === "nyc"
                          ? settings.cold_email_subject ?? DEFAULT_COLD_EMAIL_SUBJECT_NYC
                          : DEFAULT_COLD_EMAIL_SUBJECT_ROCKLAND)
                      }
                    />
                  </div>
                  {[1, 2, 3, 4].map((step) => (
                    <div key={`${step}_${emailLocation}`} className="space-y-1.5">
                      <Label htmlFor={`cold_email_step_${step}_${emailLocation}`}>
                        Step {step}
                      </Label>
                      <Textarea
                        id={`cold_email_step_${step}_${emailLocation}`}
                        name={`cold_email_step_${step}_${emailLocation}`}
                        rows={7}
                        defaultValue={
                          settings[`cold_email_step_${step}_${emailLocation}`] ??
                          (emailLocation === "nyc"
                            ? settings[`cold_email_step_${step}`] ??
                              DEFAULT_COLD_EMAIL_STEPS_NYC[step - 1] ?? ""
                            : DEFAULT_COLD_EMAIL_STEPS_ROCKLAND[step - 1] ?? "")
                        }
                      />
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={coldEmail.isPending}>
                    {coldEmail.isPending
                      ? "Saving..."
                      : `Save ${emailLocation === "nyc" ? "NYC" : "Rockland"} Templates`}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
