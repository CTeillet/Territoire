import { TerritoryStatus } from "@/models/territory-status";

export interface TerritoryStatusStyle {
  /** Couleur du statut : polygones de la carte, pastille des badges, graphiques. */
  color: string;
  /** Classes du badge : fond pâle et texte foncé de la même teinte. */
  badge: string;
}

/**
 * Seule source des couleurs de statut d'un territoire : la carte, les tableaux, la fiche, la recherche et
 * les graphiques les prennent ici, pour qu'un statut ait la même couleur partout.
 */
export const TERRITORY_STATUS_STYLES: Record<
  TerritoryStatus,
  TerritoryStatusStyle
> = {
  AVAILABLE: {
    color: "#9333ea",
    badge: "border-purple-200 bg-purple-100 text-purple-800",
  },
  ASSIGNED: {
    color: "#22c55e",
    badge: "border-green-200 bg-green-100 text-green-800",
  },
  LATE: {
    color: "#ec4899",
    badge: "border-pink-200 bg-pink-100 text-pink-800",
  },
  PENDING: {
    color: "#0ea5e9",
    badge: "border-sky-200 bg-sky-100 text-sky-800",
  },
};

const UNKNOWN_STATUS_STYLE: TerritoryStatusStyle = {
  color: "#6b7280",
  badge: "border-gray-200 bg-gray-100 text-gray-700",
};

/** Style d'un statut, gris s'il est inconnu (valeur inattendue du back). */
export const territoryStatusStyle = (
  status: TerritoryStatus
): TerritoryStatusStyle =>
  TERRITORY_STATUS_STYLES[status] ?? UNKNOWN_STATUS_STYLE;

/** Forme commune des badges (celle de components/ui/badge), pour le popup de la carte construit hors React. */
export const STATUS_BADGE_BASE =
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";
