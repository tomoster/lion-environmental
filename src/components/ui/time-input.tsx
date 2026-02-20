"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function to24h(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${minute}`;
}

function from24h(time: string): { hour: string; minute: string; period: string } {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  const m = parseInt(mStr, 10);
  const rounded = Math.round(m / 5) * 5;
  const finalM = rounded === 60 ? 0 : rounded;
  return {
    hour: h.toString(),
    minute: finalM.toString().padStart(2, "0"),
    period,
  };
}

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

type TimeInputProps = {
  id?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  className?: string;
};

export function TimeInput({ id, name, defaultValue, value: controlledValue, onChange, className }: TimeInputProps) {
  const isControlled = controlledValue !== undefined;
  const sourceValue = isControlled ? controlledValue : defaultValue;

  const initial = sourceValue ? from24h(sourceValue) : { hour: "9", minute: "00", period: "AM" };
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState(initial.period);
  const [hasValue, setHasValue] = useState(!!sourceValue);

  useEffect(() => {
    if (isControlled) {
      if (controlledValue) {
        const parsed = from24h(controlledValue);
        setHour(parsed.hour);
        setMinute(parsed.minute);
        setPeriod(parsed.period);
        setHasValue(true);
      } else {
        setHasValue(false);
      }
    }
  }, [controlledValue, isControlled]);

  const value24 = hasValue ? to24h(hour, minute, period) : "";

  function handleChange(h: string, m: string, p: string) {
    setHour(h);
    setMinute(m);
    setPeriod(p);
    setHasValue(true);
    const newValue = to24h(h, m, p);
    onChange?.({ target: { value: newValue } });
  }

  return (
    <div className={className}>
      <input type="hidden" id={id} name={name} value={value24} />
      <div className="flex gap-1.5">
        <Select
          value={hasValue ? hour : undefined}
          onValueChange={(v) => handleChange(v, minute, period)}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="Hr" />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={hasValue ? minute : undefined}
          onValueChange={(v) => handleChange(hour, v, period)}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={hasValue ? period : undefined}
          onValueChange={(v) => handleChange(hour, minute, v)}
        >
          <SelectTrigger className="w-[72px]">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
