"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, MaplibreGL } from "leaflet";
import { TileLayer, useMap } from "react-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { filterStyle, IGN_ATTRIBUTION, loadIgnStyle } from "@/lib/ign-plan";
import { useMapThemes } from "@/lib/map-themes";
import { MapView } from "@/models/map-view";
import { PlanTheme } from "@/models/plan-theme";

/** Fond de secours : vieux téléphone sans WebGL, ou plan IGN injoignable. */
const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = "&copy; OpenStreetMap contributors";

/** MapLibre dessine le plan en WebGL : sans lui (vieux appareil, tests), on garde le fond OpenStreetMap. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Appelle ready une fois la carte Leaflet dotée d'une taille : MapLibre ne sait pas dessiner une carte de 0 pixel
 * (carte créée avant que la page soit mise en page). Renvoie de quoi arrêter l'attente.
 */
function whenSized(map: LeafletMap, ready: () => void): () => void {
  const container = map.getContainer();
  const sized = () => {
    if (container.clientWidth === 0 || container.clientHeight === 0)
      return false;
    // Leaflet garde la taille lue à sa création : la relire
    map.invalidateSize();
    return true;
  };
  if (sized()) {
    ready();
    return () => {};
  }
  const observer = new ResizeObserver(() => {
    if (!sized()) return;
    observer.disconnect();
    ready();
  });
  observer.observe(container);
  return () => observer.disconnect();
}

/**
 * Fond d'une carte Leaflet : le Plan IGN vectoriel avec les thèmes donnés (maisons, végétation…), dessiné par
 * MapLibre sous les couches de la carte (territoires, pâtés, repères), qui gardent leur fonctionnement. Changer
 * les thèmes redessine le fond sans recréer la carte.
 */
export function IgnBaseLayer({ themes }: { themes: readonly PlanTheme[] }) {
  const map = useMap();
  const [layer, setLayer] = useState<MaplibreGL | null>(null);
  // Carte rendue côté navigateur seulement (chargée sans rendu serveur) : document existe
  const [webgl] = useState(hasWebGL);
  const [failed, setFailed] = useState(false);
  // Thèmes du style posé : la création en pose un, un changement en pose un autre
  const shown = useRef<string | null>(null);
  const themesKey = themes.join(",");

  useEffect(() => {
    if (!webgl) return;
    let cancelled = false;
    let created: MaplibreGL | null = null;
    let stopWaiting = () => {};
    (async () => {
      try {
        const [, { maplibreGL }, style] = await Promise.all([
          // Donne à MapLibre l'adresse de son worker, avant que la couche crée la carte
          import("@/lib/maplibre"),
          import("@maplibre/maplibre-gl-leaflet"),
          loadIgnStyle(),
        ]);
        await new Promise<void>((resolve) => {
          stopWaiting = whenSized(map, resolve);
        });
        if (cancelled) return;
        created = maplibreGL({
          style: filterStyle(style, themes),
          attributionControl: { customAttribution: IGN_ATTRIBUTION },
        });
        created.addTo(map);
        shown.current = themes.join(",");
        setLayer(created);
      } catch (error) {
        console.error("Plan IGN indisponible, fond OpenStreetMap", error);
        // Couche à moitié posée : la retirer avant de poser le fond de secours
        try {
          created?.remove();
        } catch {
          // déjà retirée
        }
        created = null;
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      stopWaiting();
      created?.remove();
    };
    // Une seule création par carte : les thèmes suivants passent par setStyle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, webgl]);

  useEffect(() => {
    if (!layer || shown.current === themesKey) return;
    let cancelled = false;
    loadIgnStyle()
      .then((style) => {
        if (cancelled) return;
        layer
          .getMaplibreMap()
          .setStyle(
            filterStyle(
              style,
              themesKey ? (themesKey.split(",") as PlanTheme[]) : []
            )
          );
        shown.current = themesKey;
      })
      .catch((error) => console.error("Plan IGN non redessiné", error));
    return () => {
      cancelled = true;
    };
  }, [layer, themesKey]);

  return !webgl || failed ? (
    <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
  ) : null;
}

/**
 * Fond d'une carte de l'application, avec les thèmes réglés pour elle dans Paramètres > Cartes. Le fond attend les
 * réglages (une requête par page) plutôt que de se redessiner aussitôt.
 */
export function MapBackground({ view }: { view: MapView }) {
  const themes = useMapThemes(view);
  return themes ? <IgnBaseLayer themes={themes} /> : null;
}
