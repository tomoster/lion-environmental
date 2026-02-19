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
import { updateSettings } from "./actions";

interface SettingsFormProps {
  settings: Record<string, string>;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isBizPending, startBizTransition] = useTransition();
  const [isXrfPending, startXrfTransition] = useTransition();
  const [isDustSwabPending, startDustSwabTransition] = useTransition();
  const [isTelegramPending, startTelegramTransition] = useTransition();

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
            <CardTitle>XRF Scanning (LPT)</CardTitle>
            <CardDescription>
              Default pricing and duration estimates for XRF scanning jobs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lpt_price_per_unit">Price / Unit ($)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="lpt_price_per_unit"
                    name="lpt_price_per_unit"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={settings.lpt_price_per_unit ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lpt_price_per_common_space">Price / Common Space ($)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="lpt_price_per_common_space"
                    name="lpt_price_per_common_space"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={settings.lpt_price_per_common_space ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lpt_duration_per_unit">Minutes / Unit</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="lpt_duration_per_unit"
                    name="lpt_duration_per_unit"
                    type="number"
                    min="1"
                    defaultValue={settings.lpt_duration_per_unit ?? "45"}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lpt_duration_per_common_space">Minutes / Common Space</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="lpt_duration_per_common_space"
                    name="lpt_duration_per_common_space"
                    type="number"
                    min="1"
                    defaultValue={settings.lpt_duration_per_common_space ?? "30"}
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTelegramTransition(async () => {
            const result = await updateSettings(formData);
            if (result.error) {
              toast.error(result.error);
            } else {
              toast.success("Telegram settings saved.");
            }
          });
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Telegram</CardTitle>
            <CardDescription>
              Telegram bot notifications for job dispatch and worker communication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="avi_telegram_chat_id">
                Avi's Telegram Chat ID
              </Label>
              <Input
                id="avi_telegram_chat_id"
                name="avi_telegram_chat_id"
                defaultValue={settings.avi_telegram_chat_id ?? ""}
                placeholder="Numeric chat ID from Telegram"
              />
              <p className="text-xs text-muted-foreground">
                Avi receives job updates, report approvals, and alert notifications here.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isTelegramPending}>
              {isTelegramPending ? "Saving..." : "Save Telegram Settings"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
