"use client";

import { PieChart, Pie, Tooltip, Legend } from "recharts";
import { TerritoryStatusData } from "@/models/chart-data";
import { ChartWrapper } from "@/components/shared/charts/chart-wrapper";

interface TerritoryStatusPieChartProps {
  data: TerritoryStatusData[];
  colors: string[];
}

export function TerritoryStatusPieChart({
  data,
  colors,
}: TerritoryStatusPieChartProps) {
  return (
    <ChartWrapper title="Répartition des territoires">
      <PieChart>
        <Pie
          data={data.map((entry, index) => ({
            ...entry,
            fill: colors[index % colors.length],
          }))}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent }) =>
            `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        />
        <Tooltip
          formatter={(value, name, props) => {
            // For PieChart, name is the category (value)
            return [value, props.payload.name];
          }}
        />
        <Legend />
      </PieChart>
    </ChartWrapper>
  );
}
