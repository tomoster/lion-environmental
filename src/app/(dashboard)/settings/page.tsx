import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("settings").select("key, value");

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-destructive mt-4 text-sm">
          Failed to load settings: {error.message}
        </p>
      </div>
    );
  }

  const settings: Record<string, string> = Object.fromEntries(
    (data ?? []).map(({ key, value }) => [key, value])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure business information and pricing defaults.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
