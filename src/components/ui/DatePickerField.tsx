"use client";

import { CalendarIcon } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/design-system/components/ui/popover";

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
  includeTime?: boolean;
}

function parseDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function serializeDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePickerField({ value, onChange, label, className, includeTime = false }: DatePickerFieldProps) {
  const selected = parseDate(value);
  const time = includeTime ? value.match(/T(\d{2}:\d{2})/)?.[1] ?? "09:00" : "";
  const formattedDate = selected?.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={label}
          className={`h-10 w-full justify-start text-left font-normal ${!selected ? "text-muted-foreground" : ""} ${className ?? ""}`}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selected ? `${formattedDate}${includeTime ? ` · ${time}` : ""}` : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? `${serializeDate(date)}${includeTime ? `T${time}` : ""}` : "")}
          autoFocus
        />
        {includeTime ? (
          <div className="border-t p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Time</span>
              <input
                aria-label={`${label} time`}
                type="time"
                value={time}
                onChange={(event) => onChange(`${selected ? serializeDate(selected) : new Date().toISOString().slice(0, 10)}T${event.target.value}`)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              />
            </label>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
