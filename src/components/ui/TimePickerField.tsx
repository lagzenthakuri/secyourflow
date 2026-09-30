"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";

interface TimePickerFieldProps {
  label: string;
  onChange: (value: string) => void;
  value: string;
}

const HOURS = Array.from({ length: 12 }, (_, index) =>
  `${index + 1}`.padStart(2, "0")
);
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  `${index}`.padStart(2, "0")
);

export function TimePickerField({
  value,
  onChange,
  label,
}: TimePickerFieldProps) {
  const [hour24 = "09", minute = "00"] = value.split(":");
  const numericHour = Number(hour24);
  const hour12 = `${numericHour % 12 || 12}`.padStart(2, "0");
  const period = numericHour >= 12 ? "PM" : "AM";

  const updateTime = (
    nextHour12 = hour12,
    nextMinute = minute,
    nextPeriod = period
  ) => {
    const parsedHour =
      (Number(nextHour12) % 12) + (nextPeriod === "PM" ? 12 : 0);
    onChange(`${`${parsedHour}`.padStart(2, "0")}:${nextMinute}`);
  };

  return (
    <div
      aria-label={label}
      className="flex items-center justify-center gap-1"
      role="group"
    >
      <Select onValueChange={(next) => updateTime(next)} value={hour12}>
        <SelectTrigger
          aria-label={`${label} hour`}
          className="h-8 w-16 px-2 [&_svg]:size-3"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-40 min-w-[4.5rem]">
          {HOURS.map((hour) => (
            <SelectItem className="h-7 py-0.5" key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span aria-hidden="true" className="text-muted-foreground">
        :
      </span>
      <Select onValueChange={(next) => updateTime(hour12, next)} value={minute}>
        <SelectTrigger
          aria-label={`${label} minute`}
          className="h-8 w-16 px-2 [&_svg]:size-3"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-40 min-w-[4.5rem]">
          {MINUTES.map((part) => (
            <SelectItem className="h-7 py-0.5" key={part} value={part}>
              {part}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        onValueChange={(next) => updateTime(hour12, minute, next)}
        value={period}
      >
        <SelectTrigger
          aria-label={`${label} AM or PM`}
          className="h-8 w-16 px-2 [&_svg]:size-3"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[4.5rem]">
          <SelectItem className="h-7 py-0.5" value="AM">
            AM
          </SelectItem>
          <SelectItem className="h-7 py-0.5" value="PM">
            PM
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
