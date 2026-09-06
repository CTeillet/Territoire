import { TerritoryType } from "./territory-type";

// Shape shared by any "used / available" territory breakdown (by campaign, by period, ...)
// so that the same chart and table components can be reused across features.
export interface TerritoryStatisticsBreakdown {
  // Total counts
  totalTerritories: number;
  usedTerritories: number;
  availableTerritories: number;

  // Counts by territory type
  totalTerritoriesByType: Record<TerritoryType, number>;
  usedTerritoriesByType: Record<TerritoryType, number>;
  availableTerritoriesByType: Record<TerritoryType, number>;

  // Counts by city name
  totalTerritoriesByCity: Record<string, number>;
  usedTerritoriesByCity: Record<string, number>;
  availableTerritoriesByCity: Record<string, number>;
}

export interface CampaignStatistics extends TerritoryStatisticsBreakdown {
  campaignId: string;
  campaignName: string;
}