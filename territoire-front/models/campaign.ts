import { SimplifiedTerritory } from "@/models/territory";

export interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  closed: boolean;
  territories: SimplifiedTerritory[];
  remainingTerritories: SimplifiedTerritory[];
}
