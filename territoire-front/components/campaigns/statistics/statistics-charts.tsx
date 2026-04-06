"use client";

import { TerritoryStatusPieChart } from "./territory-status-pie-chart";
import { TerritoryTypeBarChart } from "./territory-type-bar-chart";
import { CityBarChart } from "./city-bar-chart";
import { TerritoryStatusData, TerritoryTypeData, CityData } from "@/models/chart-data";
import { GridContainer } from "@/components/shared/ui/grid-container";

interface StatisticsChartsProps {
  territoryStatusData: TerritoryStatusData[];
  territoryTypeData: TerritoryTypeData[];
  cityData: CityData[];
  statusTranslations: Record<string, string>;
  colors: string[];
}

export function StatisticsCharts({ 
  territoryStatusData, 
  territoryTypeData, 
  cityData,
  statusTranslations, 
  colors 
}: StatisticsChartsProps) {
  return (
    <div className="space-y-8">
      <GridContainer columns={1} mdColumns={2} gap={8}>
        <TerritoryStatusPieChart data={territoryStatusData} colors={colors} />
        <TerritoryTypeBarChart data={territoryTypeData} statusTranslations={statusTranslations} />
      </GridContainer>
      <div className="w-full">
        <CityBarChart data={cityData} statusTranslations={statusTranslations} />
      </div>
    </div>
  );
}
