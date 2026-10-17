"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TerritoryTypeData } from "@/models/chart-data";
import { ChartWrapper } from "@/components/shared/charts/chart-wrapper";
import { seriesLabel } from "./series-label";

interface TerritoryTypeBarChartProps {
  data: TerritoryTypeData[];
  statusTranslations: Record<string, string>;
}

export function TerritoryTypeBarChart({
  data,
  statusTranslations,
}: TerritoryTypeBarChartProps) {
  return (
    <ChartWrapper title="Territoires par type">
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip
          formatter={(value, name) => [
            value,
            seriesLabel(name, statusTranslations),
          ]}
        />
        <Legend formatter={(value) => seriesLabel(value, statusTranslations)} />
        <Bar dataKey="used" name="used" fill="#0088FE" />
        <Bar dataKey="available" name="available" fill="#00C49F" />
      </BarChart>
    </ChartWrapper>
  );
}
