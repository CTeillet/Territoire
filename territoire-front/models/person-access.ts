export type AccessStatus = "AUCUN" | "ACTIF" | "EXPIRE" | "REVOQUE";

export const ACCESS_STATUS_LABELS: Record<AccessStatus, string> = {
  AUCUN: "Aucun lien",
  ACTIF: "Actif",
  EXPIRE: "Expiré",
  REVOQUE: "Révoqué",
};

export interface PersonAccessStatus {
  personId: string;
  personName: string;
  hasPhone: boolean;
  status: AccessStatus;
  /** Lien complet, présent uniquement si l'accès est actif. */
  link: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
  lastSentAt: string | null;
  activeTerritories: number;
}

export interface AccessSettings {
  assignmentNotificationEnabled: boolean;
  assignmentMessage: string;
  accessLinkMessage: string;
}

export interface PublicAddress {
  number: string | null;
  street: string | null;
  zipCode: string | null;
  city: string | null;
}

export interface PublicTerritory {
  id: string;
  name: string;
  cityName: string | null;
  type: "BUILDING" | "HOUSE" | null;
  note: string | null;
  assignmentDate: string | null;
  dueDate: string | null;
  late: boolean;
  /** FeatureCollection GeoJSON sérialisée (pâtés + contour). */
  geojson: string;
  addressesNotToDo: PublicAddress[];
}

export interface PublicAccess {
  firstName: string;
  territories: PublicTerritory[];
}
