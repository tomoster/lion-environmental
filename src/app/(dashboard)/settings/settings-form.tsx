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
import { updateSettings } from "./actions";

const DEFAULT_INVOICE_SUBJECT =
  "Invoice #{{invoice_number}} from Lion Environmental LLC";

const DEFAULT_INVOICE_BODY = `Dear {{company}},

Please find attached your invoice from Lion Environmental LLC.

Payment Options:
- Zelle: 2013752797
- Check payable to: Lion Environmental LLC
- Mail to: 1500 Teaneck Rd #448, Teaneck, NJ 07666

If you have any questions, please don't hesitate to reach out.

Thank you for your business!`;

const DEFAULT_REPORT_SUBJECT = "{{service_type}} Report — {{address}}";

const DEFAULT_REPORT_BODY = `Dear {{company}},

Please find attached the {{service_type}} report for the property at {{address}}.

If you have any questions about this report, please don't hesitate to reach out.

Thank you for choosing Lion Environmental!`;

const DEFAULT_COLD_EMAIL_SUBJECT_NYC = "Quick question about {{company}}";
const DEFAULT_COLD_EMAIL_SUBJECT_ROCKLAND = "Quick question about {{company}}";

const DEFAULT_COLD_EMAIL_STEPS_NYC = [
  `Hi {{first_name}},

I run a lead paint testing company in the NJ/NYC area. With the Local Law 31 deadlines coming up, a lot of property managers are scrambling to get inspections done.

We handle everything - full-building XRF inspections with reports ready in 48-72 hours.

Would it make sense to chat for 5 minutes about your buildings?

Best,
Avi Bursztyn
Lion Environmental LLC
(201) 375-2797`,

  `Hi {{first_name}},

Following up on my last note. NYC just expanded enforcement on Local Law 31 - fines start at $1,000 per unit for non-compliance, and they're actively issuing violations.

We do full-building inspections with certified reports, typically turned around in 2-3 days. Happy to give you a quick quote if you want to compare pricing.

Best,
Avi Bursztyn
Lion Environmental LLC
(201) 375-2797`,

  `Hi {{first_name}},

Just finished a 24-unit building inspection in Jersey City - results back in 2 days, client was happy with the pricing.

If you're shopping around for lead paint testing, happy to put together a comparison quote. No pressure either way.

Best,
Avi Bursztyn
Lion Environmental LLC
(201) 375-2797`,

  `Hi {{first_name}},

Haven't heard back, totally understand - you're busy.

If lead paint testing ever comes up down the road, my number is (201) 375-2797. Always happy to help.

Best,
Avi Bursztyn
Lion Environmental LLC`,
];

const DEFAULT_COLD_EMAIL_STEPS_ROCKLAND = [
  `Hi {{first_name}},

I run a lead paint testing company serving the Rockland County area. New York State requires lead paint inspections for all pre-1980 multi-family rental properties — and Rockland County is offering up to $40,000 per unit in remediation grants for landlords who get inspected.

We handle everything — full-building XRF inspections with certified reports in 48-72 hours.

Would it make sense to chat for 5 minutes about your properties?

Best,
Avi Bursztyn
Lion Environmental LLC
(201) 375-2797`,

  `Hi {{first_name}},

Following up on my last note. With 80% of Rockland County homes built before 1978, most multi-family rentals require lead paint inspections under NY State law. The county's remediation grant program ($40k/unit) requires an inspection first — it's a good time to get ahead of it.

We do full-building inspections with certified reports, typically turned around in 2-3 days. Happy to give you a quick quote.

Best,
Avi Bursztyn
Lion Environmental LLC
(201) 375-2797`,

  `Hi {{first_name}},

Just finished inspecting a multi-family property in New City — results back in 2 days. The owner is applying for the Rockland County remediation grant, which covers up to $40k per unit.

If you've been thinking about getting your buildings inspected, happy to put together a quote. No pressure either way.

Best,
Avi Bursztyn
Lion Environmental LLC
(201) 375-2797`,

  `Hi {{first_name}},

Haven't heard back, totally understand — you're busy.

If lead paint testing or the Rockland County remediation grants ever come up, my number is (201) 375-2797. Always happy to help.

Best,
Avi Bursztyn
Lion Environmental LLC`,
];

interface SettingsFormProps {
  settings: Record<string, string>;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [emailLocation, setEmailLocation] = useState<"nyc" | "rockland">("nyc");
  const [isBizPending, startBizTransition] = useTransition();
  const [isXrfPending, startXrfTransition] = useTransition();
  const [isDustSwabPending, startDustSwabTransition] = useTransition();
  const [isAsbestosPending, startAsbestosTransition] = useTransition();
  const [isInvoiceTplPending, startInvoiceTplTransition] = useTransition();
  const [isReportTplPending, startReportTplTransition] = useTransition();
  const [isColdEmailPending, startColdEmailTransition] = useTransition();

  function handleBusinessSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startBizTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Business information saved.");
      }
    });
  }

  function handleXrfSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startXrfTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("XRF scanning settings saved.");
      }
    });
  }

  function handleDustSwabSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startDustSwabTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Dust swab settings saved.");
      }
    });
  }

  function handleAsbestosSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startAsbestosTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Asbestos testing settings saved.");
      }
    });
  }

  function handleInvoiceTplSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startInvoiceTplTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Invoice email template saved.");
      }
    });
  }

  function handleReportTplSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startReportTplTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Report email template saved.");
      }
    });
  }

  function handleColdEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startColdEmailTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Cold email templates saved.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleBusinessSubmit}>
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
            <Button type="submit" disabled={isBizPending}>
              {isBizPending ? "Saving..." : "Save Business Information"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form onSubmit={handleXrfSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>XRF Scanning</CardTitle>
            <CardDescription>
              Default pricing and duration estimates for XRF scanning jobs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="xrf_price_per_unit">Price / Unit ($)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="xrf_price_per_unit"
                    name="xrf_price_per_unit"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={settings.xrf_price_per_unit ?? ""}
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
                    defaultValue={settings.xrf_price_per_common_space ?? ""}
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
            <Button type="submit" disabled={isXrfPending}>
              {isXrfPending ? "Saving..." : "Save XRF Settings"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form onSubmit={handleDustSwabSubmit}>
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
                <Label htmlFor="dust_swab_site_visit">Site Visit ($)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="dust_swab_site_visit"
                    name="dust_swab_site_visit"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={settings.dust_swab_site_visit ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dust_swab_report">Report ($)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="dust_swab_report"
                    name="dust_swab_report"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={settings.dust_swab_report ?? ""}
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
            <Button type="submit" disabled={isDustSwabPending}>
              {isDustSwabPending ? "Saving..." : "Save Dust Swab Settings"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form onSubmit={handleAsbestosSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Asbestos Testing</CardTitle>
            <CardDescription>
              Duration estimate for asbestos testing jobs. Pricing TBD.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
            <Button type="submit" disabled={isAsbestosPending}>
              {isAsbestosPending ? "Saving..." : "Save Asbestos Settings"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <div className="pt-4">
        <h2 className="text-lg font-semibold">Email Templates</h2>
        <p className="text-sm text-muted-foreground">
          Customize the emails sent with invoices and reports. Use{" "}
          {"{{variable}}"} placeholders for dynamic content.
        </p>
      </div>

      <form onSubmit={handleInvoiceTplSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Invoice Email</CardTitle>
            <CardDescription>
              Sent when an invoice is emailed to a client. Available variables:{" "}
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
                rows={10}
                defaultValue={
                  settings.invoice_email_body ?? DEFAULT_INVOICE_BODY
                }
              />
              <p className="text-xs text-muted-foreground">
                The invoice details table and signature are added automatically.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isInvoiceTplPending}>
              {isInvoiceTplPending ? "Saving..." : "Save Invoice Template"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form onSubmit={handleReportTplSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Report Email</CardTitle>
            <CardDescription>
              Sent when a report is emailed to a client. Available variables:{" "}
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
                The report details table and signature are added automatically.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isReportTplPending}>
              {isReportTplPending ? "Saving..." : "Save Report Template"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form onSubmit={handleColdEmailSubmit}>
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
            <Button type="submit" disabled={isColdEmailPending}>
              {isColdEmailPending
                ? "Saving..."
                : `Save ${emailLocation === "nyc" ? "NYC" : "Rockland"} Templates`}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
