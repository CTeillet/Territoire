"use client";

import { TerritoryStatusPieChart } from "./territory-status-pie-chart";
import { TerritoryTypeBarChart } from "./territory-type-bar-chart";
import { TerritoryStatusData, TerritoryTypeData } from "@/models/chart-data";
import { GridContainer } from "@/components/shared/ui/grid-container";

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
      <GridContainer columns={1} mdColumns={2} gap={8}>
        <TerritoryStatusPieChart data={territoryStatusData} colors={colors} />
        <TerritoryTypeBarChart data={territoryTypeData} statusTranslations={statusTranslations} />
      </GridContainer>
    </div>
  );
}
