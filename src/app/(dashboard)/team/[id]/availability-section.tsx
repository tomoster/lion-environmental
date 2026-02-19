"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addRecurringBlock, addOneOffBlock, removeAvailabilityBlock } from "../actions";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type AvailabilityBlock = {
  id: string;
  type: string;
  day_of_week: number | null;
  specific_date: string | null;
  reason: string | null;
};

type Props = {
  workerId: string;
  blocks: AvailabilityBlock[];
};

export function AvailabilitySection({ workerId, blocks }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState("");

  const recurringBlocks = blocks.filter((b) => b.type === "recurring");
  const oneOffBlocks = blocks.filter((b) => b.type === "one_off");

  const existingDays = new Set(recurringBlocks.map((b) => b.day_of_week));

  function handleAddRecurring() {
    if (!selectedDay) return;
    startTransition(async () => {
      const result = await addRecurringBlock(workerId, parseInt(selectedDay));
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added recurring day off`);
        setSelectedDay("");
      }
    });
  }

  function handleAddOneOff() {
    if (!selectedDate) return;
    startTransition(async () => {
      const result = await addOneOffBlock(workerId, selectedDate, reason);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added day off`);
        setSelectedDate("");
        setReason("");
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeAvailabilityBlock(id, workerId);
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium">Recurring Days Off</p>
          {recurringBlocks.length === 0 && (
            <p className="text-sm text-muted-foreground">No recurring days off set.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {recurringBlocks.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-sm"
              >
                Every {DAY_NAMES[b.day_of_week!]}
                <button
                  onClick={() => handleRemove(b.id)}
                  disabled={isPending}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i)} disabled={existingDays.has(i)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddRecurring}
              disabled={isPending || !selectedDay}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">One-Off Days Off</p>
          {oneOffBlocks.length === 0 && (
            <p className="text-sm text-muted-foreground">No upcoming days off.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {oneOffBlocks.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-sm"
              >
                {new Date(b.specific_date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {b.reason && (
                  <span className="text-muted-foreground">({b.reason})</span>
                )}
                <button
                  onClick={() => handleRemove(b.id)}
                  disabled={isPending}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
            <Input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-40"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddOneOff}
              disabled={isPending || !selectedDate}
            >
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
