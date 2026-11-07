package com.teillet.territoire.enums;

/**
 * Thème du Plan IGN vectoriel qu'on peut montrer ou cacher sur une carte (cf. PLAN_THEMES de lib/ign-plan.ts côté
 * front, qui en regroupe les couches). Les rues, leurs noms, l'eau et les voies ferrées restent toujours.
 */
public enum PlanTheme {
    /** Noms de quartiers, lieux-dits, repères (mairie, gare…). */
    PLACES,
    /** Bâtiments publics, commerciaux, religieux, sportifs. */
    BUILDINGS,
    /** Bâti quelconque : les maisons et immeubles. */
    HOUSES,
    VEGETATION,
    /** Zones d'activité et d'intérêt : écoles, parkings, zones commerciales. */
    ZONES,
    /** Limites de commune, clôtures et murs. */
    LIMITS,
    RELIEF,
    CADASTRE,
    /** Numéros des adresses. */
    NUMBERS
}
