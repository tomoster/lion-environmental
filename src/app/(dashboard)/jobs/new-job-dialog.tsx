"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JobForm } from "./job-form";

type Worker = {
  id: string;
  name: string;
  active: boolean | null;
};

type DurationDefaults = {
  xrf_duration_per_unit: number;
  xrf_duration_per_common_space: number;
  dust_swab_duration: number;
  asbestos_duration: number;
};

export function NewJobDialog({
  workers,
  durationDefaults,
}: {
  workers: Worker[];
  durationDefaults: DurationDefaults;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Job</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        <JobForm
          workers={workers}
          durationDefaults={durationDefaults}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
