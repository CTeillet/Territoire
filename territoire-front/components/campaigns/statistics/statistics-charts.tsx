"use client";

import { TerritoryStatusPieChart } from "./territory-status-pie-chart";
import { TerritoryTypeBarChart } from "./territory-type-bar-chart";

interface TerritoryStatusData {
  name: string;
  value: number;
  key: string;
}

interface TerritoryTypeData {
  name: string;
  used: number;
  available: number;
}

interface StatisticsChartsProps {
  territoryStatusData: TerritoryStatusData[];
  territoryTypeData: TerritoryTypeData[];
  statusTranslations: Record<string, string>;
  colors: string[];
}

export function StatisticsCharts({ 
  territoryStatusData, 
  territoryTypeData, 
  statusTranslations, 
  colors 
}: StatisticsChartsProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <TerritoryStatusPieChart data={territoryStatusData} colors={colors} />
        <TerritoryTypeBarChart data={territoryTypeData} statusTranslations={statusTranslations} />
      </div>
    </div>
  );
}