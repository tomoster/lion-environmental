"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateSettings } from "./actions";

interface SettingsFormProps {
  settings: Record<string, string>;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isBizPending, startBizTransition] = useTransition();
  const [isPricingPending, startPricingTransition] = useTransition();

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

  function handlePricingSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startPricingTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Pricing defaults saved.");
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
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isBizPending}>
              {isBizPending ? "Saving..." : "Save Business Information"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form onSubmit={handlePricingSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Pricing Defaults</CardTitle>
            <CardDescription>
              Default rates used when creating invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
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

            <Separator />

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Dust Swab</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  LPT pricing is per-job and entered when creating the job.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dust_swab_site_visit">Site Visit</Label>
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
                  <Label htmlFor="dust_swab_report">Report</Label>
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
                  <Label htmlFor="dust_swab_wipe_rate">Wipe Rate</Label>
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
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPricingPending}>
              {isPricingPending ? "Saving..." : "Save Pricing Defaults"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
