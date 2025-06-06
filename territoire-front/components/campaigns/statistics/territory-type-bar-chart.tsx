"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TerritoryTypeData {
  name: string;
  used: number;
  available: number;
}

interface TerritoryTypeBarChartProps {
  data: TerritoryTypeData[];
  statusTranslations: Record<string, string>;
}

export function TerritoryTypeBarChart({ data, statusTranslations }: TerritoryTypeBarChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Territoires par type</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value, name) => {
              if (name === "used") return [value, statusTranslations.used];
              if (name === "available") return [value, statusTranslations.available];
              return [value, name];
            }} />
            <Legend formatter={(value) => {
              if (value === "used") return statusTranslations.used;
              if (value === "available") return statusTranslations.available;
              return value;
            }} />
            <Bar dataKey="used" name="used" fill="#0088FE" />
            <Bar dataKey="available" name="available" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}