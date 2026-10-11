"use client";

import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { geoJSON, LatLngBounds } from "leaflet";
import type { FeatureCollection } from "geojson";

/**
 * Carte d'un territoire (contour en rouge, pâtés en bleu) pour la page publique.
 * Chargée uniquement côté navigateur (Leaflet n'existe pas côté serveur).
 */
export default function PublicTerritoryMap({ geojson }: { geojson: string }) {
  const { hull, blocks, bounds } = useMemo(() => {
    let collection: FeatureCollection;
    try {
      collection = JSON.parse(geojson) as FeatureCollection;
    } catch {
      collection = { type: "FeatureCollection", features: [] };
    }
    const hullFeatures = collection.features.filter(
      (f) => f.properties?.type === "CONCAVE_HULL"
    );
    const blockFeatures = collection.features.filter(
      (f) => f.properties?.type === "BLOCK"
    );
    const all = hullFeatures.length > 0 ? hullFeatures : blockFeatures;
    const layerBounds: LatLngBounds | null =
      all.length > 0
        ? geoJSON({
            type: "FeatureCollection",
            features: all,
          } as FeatureCollection).getBounds()
        : null;
    return {
      hull: {
        type: "FeatureCollection",
        features: hullFeatures,
      } as FeatureCollection,
      blocks: {
        type: "FeatureCollection",
        features: blockFeatures,
      } as FeatureCollection,
      bounds: layerBounds?.isValid() ? layerBounds : null,
    };
  }, [geojson]);

  if (!bounds) {
    return (
      <p className="text-sm text-muted-foreground">
        Pas encore de carte pour ce territoire.
      </p>
    );
  }

  const center = bounds.getCenter();

  return (
    <div className="space-y-2">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [20, 20] }}
        scrollWheelZoom={false}
        style={{ height: "320px", width: "100%", zIndex: 0 }}
        className="rounded-md border"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <GeoJSON
          data={blocks}
          style={{ color: "#2563eb", weight: 1, fillOpacity: 0.15 }}
        />
        <GeoJSON
          data={hull}
          style={{ color: "#dc2626", weight: 3, fillOpacity: 0.05 }}
        />
      </MapContainer>
      <a
        className="text-sm text-blue-700 underline"
        href={`https://www.google.com/maps/search/?api=1&query=${center.lat.toFixed(6)},${center.lng.toFixed(6)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Ouvrir dans une application de navigation
      </a>
    </div>
  );
}
