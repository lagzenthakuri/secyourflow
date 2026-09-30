"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelectProps {
  className?: string;
  label: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  value: string;
}

export function FilterSelect({
  label,
  value,
  options,
  onValueChange,
  className,
}: FilterSelectProps) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger
        aria-label={label}
        className={`h-10 w-full min-w-0 bg-background ${className ?? ""}`}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
