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
}