/**
 * Thèmes du Plan IGN vectoriel qu'on peut montrer ou cacher sur une carte (cf. PlanTheme côté back). Les rues, leurs
 * noms, l'eau et les voies ferrées restent toujours : c'est ce qui sert à trouver un territoire.
 */
export const PLAN_THEMES = [
  { id: "PLACES", label: "Noms de lieux et repères" },
  { id: "BUILDINGS", label: "Bâtiments publics et commerciaux" },
  { id: "HOUSES", label: "Maisons" },
  { id: "VEGETATION", label: "Végétation et parcs" },
  { id: "ZONES", label: "Zones (écoles, parkings, activités)" },
  { id: "LIMITS", label: "Limites de commune, clôtures et murs" },
  { id: "RELIEF", label: "Relief" },
  { id: "CADASTRE", label: "Cadastre" },
  { id: "NUMBERS", label: "Numéros de rue" },
] as const;

export type PlanTheme = (typeof PLAN_THEMES)[number]["id"];

/** Thèmes choisis, dans l'ordre de PLAN_THEMES : un même choix donne toujours la même liste. */
export const orderedThemes = (themes: Iterable<PlanTheme>): PlanTheme[] => {
  const chosen = new Set(themes);
  return PLAN_THEMES.map((theme) => theme.id).filter((id) => chosen.has(id));
};
