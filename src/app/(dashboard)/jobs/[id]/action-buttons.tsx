"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DispatchButton({ action, label = "Dispatch to Workers" }: { action: () => Promise<void>; label?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form action={() => startTransition(() => action())}>
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Dispatching..." : label}
      </Button>
    </form>
  );
}

export function ClientPaidButton({ action }: { action: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form action={() => startTransition(() => action())}>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Processing..." : "Client Paid"}
      </Button>
    </form>
  );
}
