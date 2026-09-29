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
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  onValueChange: (value: string) => void;
  className?: string;
}

export function FilterSelect({ label, value, options, onValueChange, className }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label} className={`h-10 w-full min-w-0 bg-background ${className ?? ""}`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
