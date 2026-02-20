"use client";

import { Input } from "@/components/ui/input";
import { type ComponentProps } from "react";

function roundTo5Minutes(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const rounded = Math.round(m / 5) * 5;
  const finalM = rounded === 60 ? 0 : rounded;
  const finalH = rounded === 60 ? h + 1 : h;
  return `${finalH.toString().padStart(2, "0")}:${finalM.toString().padStart(2, "0")}`;
}

type TimeInputProps = Omit<ComponentProps<typeof Input>, "type" | "step" | "onChange"> & {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function TimeInput({ onChange, ...props }: TimeInputProps) {
  return (
    <Input
      {...props}
      type="time"
      step="300"
      onChange={(e) => {
        if (e.target.value) {
          e.target.value = roundTo5Minutes(e.target.value);
        }
        onChange?.(e);
      }}
    />
  );
}
