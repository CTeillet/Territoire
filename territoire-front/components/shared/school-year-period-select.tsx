"use client";

import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchoolYearPeriod } from "@/models/school-year-period";

interface SchoolYearPeriodSelectProps {
  periods: SchoolYearPeriod[];
  value: SchoolYearPeriod | null;
  onChange: (period: SchoolYearPeriod) => void;
  id?: string;
}

/** Choix de la période scolaire (du 1er septembre au 31 août), le même sur toutes les pages qui en dépendent. */
export function SchoolYearPeriodSelect({
  periods,
  value,
  onChange,
  id = "period-select",
}: SchoolYearPeriodSelectProps) {
  const handleChange = (startYear: string) => {
    const period = periods.find((p) => p.startYear === Number(startYear));
    if (period) onChange(period);
  };

  return (
    <div className="flex items-center gap-3">
      <Calendar aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
      <label htmlFor={id} className="text-sm font-medium whitespace-nowrap">
        Période scolaire :
      </label>
      <Select
        value={value ? String(value.startYear) : undefined}
        onValueChange={handleChange}
        disabled={periods.length === 0}
      >
        <SelectTrigger id={id} className="w-full max-w-[200px] bg-background">
          <SelectValue placeholder="Sélectionner une période" />
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => (
            <SelectItem key={period.startYear} value={String(period.startYear)}>
              {period.label} {period.current ? "(En cours)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
