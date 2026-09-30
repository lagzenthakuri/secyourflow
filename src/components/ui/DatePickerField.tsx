"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { TimePickerField } from "@/components/ui/TimePickerField";

interface DatePickerFieldProps {
  className?: string;
  includeTime?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

function parseDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return undefined;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function serializeDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePickerField({
  value,
  onChange,
  label,
  className,
  includeTime = false,
}: DatePickerFieldProps) {
  const selected = parseDate(value);
  const [visibleMonth, setVisibleMonth] = useState(
    () => selected ?? new Date(2000, 0, 1)
  );
  const currentYear = new Date().getFullYear();
  // Keep the year menu useful and compact while still allowing older records
  // and dates well into the future to remain selectable.
  const firstYear = Math.min(currentYear - 20, visibleMonth.getFullYear());
  const lastYear = Math.max(currentYear + 20, visibleMonth.getFullYear());
  const time = includeTime
    ? (value.match(/T(\d{2}:\d{2})/)?.[1] ?? "09:00")
    : "";
  const formattedDate = selected
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(
        new Date(
          Date.UTC(
            selected.getFullYear(),
            selected.getMonth(),
            selected.getDate()
          )
        )
      )
    : undefined;
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, index, 1))
    )
  );

  useEffect(() => {
    setVisibleMonth(
      selected
        ? new Date(selected.getFullYear(), selected.getMonth(), 1)
        : new Date()
    );
  }, [selected]);

  const changeMonth = (month: number) =>
    setVisibleMonth(new Date(visibleMonth.getFullYear(), month, 1));
  const changeYear = (year: number) =>
    setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={label}
          className={`h-10 w-full justify-start text-left font-normal ${selected ? "" : "text-muted-foreground"} ${className ?? ""}`}
          type="button"
          variant="outline"
        >
          <CalendarIcon className="mr-2 size-4" />
          {selected
            ? `${formattedDate}${includeTime ? ` · ${time}` : ""}`
            : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 max-w-[calc(100vw-1rem)] p-0"
      >
        <div className="flex items-center justify-between gap-1.5 border-b px-1.5 py-1.5">
          <Button
            aria-label="Previous month"
            className="size-7 shrink-0"
            disabled={
              visibleMonth.getFullYear() === firstYear &&
              visibleMonth.getMonth() === 0
            }
            onClick={() =>
              setVisibleMonth(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth() - 1,
                  1
                )
              )
            }
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
            <Select
              onValueChange={(month) => changeMonth(Number(month))}
              value={`${visibleMonth.getMonth()}`}
            >
              <SelectTrigger
                aria-label="Select month"
                className="h-8 w-[7.5rem] px-2"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48 min-w-[7.5rem]">
                {monthNames.map((month, index) => (
                  <SelectItem
                    className="h-7 py-0.5"
                    key={month}
                    value={`${index}`}
                  >
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(year) => changeYear(Number(year))}
              value={`${visibleMonth.getFullYear()}`}
            >
              <SelectTrigger aria-label="Select year" className="h-8 w-20 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-40 min-w-20">
                {Array.from(
                  { length: lastYear - firstYear + 1 },
                  (_, index) => firstYear + index
                ).map((year) => (
                  <SelectItem
                    className="h-7 py-0.5"
                    key={year}
                    value={`${year}`}
                  >
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            aria-label="Next month"
            className="size-7 shrink-0"
            disabled={
              visibleMonth.getFullYear() === lastYear &&
              visibleMonth.getMonth() === 11
            }
            onClick={() =>
              setVisibleMonth(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth() + 1,
                  1
                )
              )
            }
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Calendar
          autoFocus
          captionLayout="label"
          className="mx-auto p-2"
          classNames={{
            root: "mx-auto w-fit",
            month_caption: "hidden",
            nav: "hidden",
          }}
          mode="single"
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          onSelect={(date) => {
            if (date) {
              setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
            }
            onChange(
              date
                ? `${serializeDate(date)}${includeTime ? `T${time}` : ""}`
                : ""
            );
          }}
          selected={selected}
        />
        {includeTime ? (
          <div className="space-y-1 border-t px-2 py-1.5">
            <p className="font-medium text-muted-foreground text-xs">Time</p>
            <div>
              <TimePickerField
                label={`${label} time`}
                onChange={(nextTime) =>
                  onChange(
                    `${selected ? serializeDate(selected) : serializeDate(new Date())}T${nextTime}`
                  )
                }
                value={time}
              />
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
