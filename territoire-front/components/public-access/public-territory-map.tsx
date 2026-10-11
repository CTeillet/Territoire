"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import {
  Circle,
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import { geoJSON, LatLngBounds, latLngBounds } from "leaflet";
import type { FeatureCollection } from "geojson";
import { LocateFixed, LocateOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserPosition, useUserPosition } from "@/hooks/use-user-position";

/** À la première position reçue, cadre la carte pour montrer à la fois le territoire et la personne. */
function FitToUserPosition({
  position,
  bounds,
}: {
  position: UserPosition | null;
  bounds: LatLngBounds;
}) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!position) {
      fitted.current = false;
      return;
    }
    if (fitted.current) return;
    fitted.current = true;
    map.fitBounds(
      latLngBounds(bounds.getSouthWest(), bounds.getNorthEast()).extend([
        position.lat,
        position.lng,
      ]),
      { padding: [30, 30], maxZoom: 18 }
    );
  }, [map, position, bounds]);

  return null;
}

/**
 * Carte d'un territoire (contour en rouge, pâtés en bleu) pour la page publique, avec la position
 * de la personne si elle l'active (pour s'orienter sur place).
 * Chargée uniquement côté navigateur (Leaflet n'existe pas côté serveur).
 */
export default function PublicTerritoryMap({ geojson }: { geojson: string }) {
  const locate = useUserPosition();
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
        {locate.position && (
          <>
            <Circle
              center={[locate.position.lat, locate.position.lng]}
              radius={locate.position.accuracy}
              pathOptions={{ color: "#1d4ed8", weight: 1, fillOpacity: 0.1 }}
            />
            <CircleMarker
              center={[locate.position.lat, locate.position.lng]}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                weight: 3,
                fillColor: "#1d4ed8",
                fillOpacity: 1,
              }}
            />
          </>
        )}
        <FitToUserPosition position={locate.position} bounds={bounds} />
      </MapContainer>
      {locate.supported && (
        <div className="flex flex-wrap items-center gap-2">
          {locate.active ? (
            <Button variant="outline" size="sm" onClick={locate.stop}>
              <LocateOff className="h-4 w-4" />
              Masquer ma position
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={locate.start}>
              <LocateFixed className="h-4 w-4" />
              Afficher ma position
            </Button>
          )}
          {locate.active && !locate.position && (
            <span className="text-sm text-muted-foreground">
              Localisation en cours…
            </span>
          )}
        </div>
      )}
      {locate.error && (
        <p className="text-sm text-amber-700" role="status">
          {locate.error}
        </p>
      )}
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
