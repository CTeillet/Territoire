"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_MAP_THEMES,
  MapThemeSettings,
  MapView,
} from "@/models/map-view";
import { PlanTheme } from "@/models/plan-theme";
import { apiRequest as request } from "@/utils/api-request";

export const fetchMapThemes = () =>
  request<MapThemeSettings>(
    "/api/settings/cartes",
    {},
    "Impossible de charger les réglages des cartes"
  );

export const saveMapThemes = (settings: MapThemeSettings) =>
  request<MapThemeSettings>(
    "/api/settings/cartes",
    { method: "PUT", body: JSON.stringify(settings) },
    "Impossible d'enregistrer les réglages des cartes"
  );

/** Réglages lus une fois par page : toutes les cartes affichées les partagent. */
let cached: Promise<MapThemeSettings> | null = null;

function loadMapThemes(): Promise<MapThemeSettings> {
  cached ??= fetchMapThemes().catch((error) => {
    cached = null;
    throw error;
  });
  return cached;
}

/** Réglages qui viennent d'être enregistrés (ou null pour les relire) : les cartes ouvertes ensuite les suivent. */
export function setCachedMapThemes(settings: MapThemeSettings | null) {
  cached = settings ? Promise.resolve(settings) : null;
}

/**
 * Thèmes du Plan IGN réglés pour une carte ; null le temps de lire les réglages (la carte attend pour ne pas
 * redessiner son fond aussitôt). Sans réglages lisibles, les thèmes par défaut.
 */
export function useMapThemes(view: MapView): PlanTheme[] | null {
  const [themes, setThemes] = useState<PlanTheme[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMapThemes()
      .then((settings) => {
        if (!cancelled)
          setThemes(settings.maps?.[view] ?? DEFAULT_MAP_THEMES[view]);
      })
      .catch(() => {
        if (!cancelled) setThemes(DEFAULT_MAP_THEMES[view]);
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  return themes;
}
