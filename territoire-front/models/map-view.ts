import { PLAN_THEMES, PlanTheme } from "@/models/plan-theme";

/** Cartes de l'application, chacune avec ses thèmes du Plan IGN (cf. MapView côté back, Paramètres > Cartes). */
export const MAP_VIEWS = [
  {
    id: "TERRITORIES",
    label: "Territoires",
    description: "Carte de tous les territoires",
  },
  {
    id: "TERRITORY",
    label: "Fiche d'un territoire",
    description: "Carte où l'on dessine les pâtés",
  },
  { id: "CAMPAIGN", label: "Campagnes", description: "Carte d'une campagne" },
  {
    id: "DASHBOARD",
    label: "Tableau de bord",
    description: "Couverture des territoires",
  },
  {
    id: "PUBLIC",
    label: "Lien personnel",
    description: "Page ouverte depuis le lien envoyé à un proclamateur",
  },
  {
    id: "CARD",
    label: "Carte physique",
    description: "Choix proposé à la génération de la carte à imprimer",
  },
] as const;

export type MapView = (typeof MAP_VIEWS)[number]["id"];

export interface MapThemeSettings {
  maps: Record<MapView, PlanTheme[]>;
}

/** À l'écran : tout sauf le relief et le cadastre. */
const ON_SCREEN: PlanTheme[] = PLAN_THEMES.map((theme) => theme.id).filter(
  (id) => id !== "RELIEF" && id !== "CADASTRE"
);

/**
 * Thèmes d'une carte jamais réglée, mêmes valeurs que le back : servent tant que les réglages ne sont pas chargés,
 * ou s'ils ne peuvent pas l'être. La carte physique ne garde que les repères, pour que les rues ressortent imprimées.
 */
export const DEFAULT_MAP_THEMES: Record<MapView, PlanTheme[]> = {
  TERRITORIES: ON_SCREEN,
  TERRITORY: ON_SCREEN,
  CAMPAIGN: ON_SCREEN,
  DASHBOARD: ON_SCREEN,
  PUBLIC: ON_SCREEN,
  CARD: ["PLACES", "BUILDINGS"],
};
