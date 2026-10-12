import { TerritoryType } from "@/models/territory-type";

export type TerritoryRequestStatus =
  "EN_ATTENTE" | "ATTRIBUEE" | "CLOTUREE" | "ANNULEE";

export const TERRITORY_REQUEST_STATUS_LABELS: Record<
  TerritoryRequestStatus,
  string
> = {
  EN_ATTENTE: "En attente",
  ATTRIBUEE: "Attribuée",
  CLOTUREE: "Clôturée",
  ANNULEE: "Annulée par la personne",
};

/** Demande de nouveau territoire faite depuis un lien personnel. */
export interface TerritoryRequest {
  id: string;
  personId: string;
  personName: string;
  /** Null = pas de préférence. */
  cityId: string | null;
  cityName: string | null;
  comment: string | null;
  status: TerritoryRequestStatus;
  createdAt: string;
  closedAt: string | null;
  /** Territoire attribué en réponse à la demande. */
  territoryId: string | null;
  territoryName: string | null;
  /** Territoires que la personne a en cours aujourd'hui. */
  activeTerritories: number;
}

/** Territoire disponible proposé pour répondre à une demande. */
export interface AvailableTerritory {
  id: string;
  name: string;
  type: TerritoryType | null;
  cityName: string | null;
  /** Null = jamais parcouru. */
  lastReturnDate: string | null;
}
