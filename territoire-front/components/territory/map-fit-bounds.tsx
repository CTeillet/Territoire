import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import { geoJsonBounds } from "@/lib/geo";

/**
 * Cadre la carte sur les territoires affichés à chaque changement de la sélection (`selectionKey`),
 * par exemple le résultat d'une recherche. Rien à cadrer sans polygone (aucun résultat).
 */
export default function MapFitBounds({
  data,
  selectionKey,
}: {
  data: FeatureCollection<Geometry | null, unknown>;
  selectionKey: string;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = geoJsonBounds(data);
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
    }
    // La sélection, pas l'objet data (recréé à chaque mise à jour du store), décide du recadrage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectionKey]);

  return null;
}
