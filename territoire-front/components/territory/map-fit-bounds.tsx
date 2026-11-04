import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import { geoJsonBounds, LatLng } from "@/lib/geo";

const FIT_OPTIONS = { padding: [30, 30] as [number, number], maxZoom: 17 };

/**
 * Cadre la carte sur les territoires affichés, et sur `point` s'il est donné (ex. une adresse cherchée),
 * à chaque changement de la sélection (`selectionKey`). Sans polygone ni point, rien à cadrer.
 */
export default function MapFitBounds({
  data,
  selectionKey,
  point,
}: {
  data: FeatureCollection<Geometry | null, unknown>;
  selectionKey: string;
  point?: LatLng | null;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = geoJsonBounds(data);
    if (bounds && point) {
      const [[south, west], [north, east]] = bounds;
      map.fitBounds(
        [
          [Math.min(south, point.lat), Math.min(west, point.lng)],
          [Math.max(north, point.lat), Math.max(east, point.lng)],
        ],
        FIT_OPTIONS
      );
    } else if (bounds) {
      map.fitBounds(bounds, FIT_OPTIONS);
    } else if (point) {
      map.setView([point.lat, point.lng], FIT_OPTIONS.maxZoom);
    }
    // La sélection, pas l'objet data (recréé à chaque mise à jour du store), décide du recadrage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectionKey]);

  return null;
}
