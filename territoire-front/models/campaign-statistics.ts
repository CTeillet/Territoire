import { TerritoryType } from "./territory-type";

export interface CampaignStatistics {
  campaignId: string;
  campaignName: string;
  
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