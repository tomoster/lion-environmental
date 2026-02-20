"use client";

import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SaveForm({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  return (
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
      {children}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
