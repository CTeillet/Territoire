import type { FeatureCollection, MultiPolygon } from "geojson";
import { SimplifiedTerritory } from "@/models/territory";
import { TerritoryType } from "@/models/territory-type";

/** Carte d'une campagne : ses territoires, et s'ils ont été parcourus pendant la campagne. */
export interface CampaignMapProperties {
  id: string;
  name: string;
  type: TerritoryType;
  usedInCampaign: boolean;
}

export type CampaignMap = FeatureCollection<
  MultiPolygon | null,
  CampaignMapProperties
>;

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
