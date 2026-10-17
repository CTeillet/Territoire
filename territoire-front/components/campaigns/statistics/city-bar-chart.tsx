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
import { CityData } from "@/models/chart-data";
import { ChartWrapper } from "@/components/shared/charts/chart-wrapper";
import { seriesLabel } from "./series-label";

interface CityBarChartProps {
  data: CityData[];
  statusTranslations: Record<string, string>;
}

export function CityBarChart({ data, statusTranslations }: CityBarChartProps) {
  return (
    <ChartWrapper title="Territoires par ville">
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          interval={0}
          height={70}
        />
        <YAxis />
        <Tooltip
          formatter={(value, name) => [
            value,
            seriesLabel(name, statusTranslations),
          ]}
        />
        <Legend
          verticalAlign="top"
          formatter={(value) => seriesLabel(value, statusTranslations)}
        />
        <Bar dataKey="used" name="used" fill="#0088FE" />
        <Bar dataKey="available" name="available" fill="#00C49F" />
      </BarChart>
    </ChartWrapper>
  );
}
