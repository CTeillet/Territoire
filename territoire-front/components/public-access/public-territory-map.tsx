"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  CircleMarker,
  GeoJSON,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import { geoJSON, LatLngBounds, latLngBounds } from "leaflet";
import type { FeatureCollection } from "geojson";
import {
  Car,
  Footprints,
  LocateFixed,
  LocateOff,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserPosition, useUserPosition } from "@/hooks/use-user-position";
import {
  directionsLinks,
  distanceMeters,
  formatDistance,
  isInside,
  LatLng,
  nearestPointOnOutline,
  TravelMode,
} from "@/lib/geo";

const TRAVEL_MODE_KEY = "itineraire-mode";

/** Dernier mode de déplacement choisi (préférence propre à l'appareil, la voiture par défaut). */
function useTravelMode() {
  const [mode, setMode] = useState<TravelMode>(() => {
    try {
      return localStorage.getItem(TRAVEL_MODE_KEY) === "walking"
        ? "walking"
        : "driving";
    } catch {
      return "driving";
    }
  });
  const choose = (next: TravelMode) => {
    setMode(next);
    try {
      localStorage.setItem(TRAVEL_MODE_KEY, next);
    } catch {
      // Préférence non mémorisée (navigation privée) : sans conséquence
    }
  };
  return [mode, choose] as const;
}

const isAppleDevice = () =>
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

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
 * de la personne si elle l'active (pour s'orienter sur place) et un itinéraire jusqu'au territoire.
 * Chargée uniquement côté navigateur (Leaflet n'existe pas côté serveur).
 */
export default function PublicTerritoryMap({ geojson }: { geojson: string }) {
  const locate = useUserPosition();
  const [travelMode, setTravelMode] = useTravelMode();
  const { hull, blocks, outline, bounds, center } = useMemo(() => {
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
    const valid = layerBounds?.isValid() ? layerBounds : null;
    // Destination sans position : le centre, ou le point du contour le plus proche s'il tombe hors du territoire
    const middle = valid
      ? { lat: valid.getCenter().lat, lng: valid.getCenter().lng }
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
      outline: all,
      bounds: valid,
      center:
        middle && !isInside(middle, all)
          ? (nearestPointOnOutline(middle, all) ?? middle)
          : middle,
    };
  }, [geojson]);

  if (!bounds || !center) {
    return (
      <p className="text-sm text-muted-foreground">
        Pas encore de carte pour ce territoire.
      </p>
    );
  }

  const position = locate.position;
  const inside = position !== null && isInside(position, outline);
  // Avec la position : guidage vers le point du territoire le plus proche
  const entry: LatLng | null =
    position && !inside ? nearestPointOnOutline(position, outline) : null;
  const links = directionsLinks(entry ?? center, travelMode);

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
        {position && entry && (
          <>
            <Polyline
              positions={[
                [position.lat, position.lng],
                [entry.lat, entry.lng],
              ]}
              pathOptions={{ color: "#1d4ed8", weight: 3, dashArray: "6 8" }}
            />
            <CircleMarker
              center={[entry.lat, entry.lng]}
              radius={6}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: "#dc2626",
                fillOpacity: 1,
              }}
            />
          </>
        )}
        {position && (
          <>
            <Circle
              center={[position.lat, position.lng]}
              radius={position.accuracy}
              pathOptions={{ color: "#1d4ed8", weight: 1, fillOpacity: 0.1 }}
            />
            <CircleMarker
              center={[position.lat, position.lng]}
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
        <FitToUserPosition position={position} bounds={bounds} />
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
          {locate.active && !position && (
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

      <section className="space-y-2 rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <Navigation className="h-4 w-4" />
            Itinéraire
          </h3>
          <div
            className="flex gap-1"
            role="group"
            aria-label="Mode de déplacement"
          >
            <Button
              size="sm"
              variant={travelMode === "driving" ? "default" : "outline"}
              aria-pressed={travelMode === "driving"}
              onClick={() => setTravelMode("driving")}
            >
              <Car className="h-4 w-4" />
              En voiture
            </Button>
            <Button
              size="sm"
              variant={travelMode === "walking" ? "default" : "outline"}
              aria-pressed={travelMode === "walking"}
              onClick={() => setTravelMode("walking")}
            >
              <Footprints className="h-4 w-4" />À pied
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {inside
            ? "Tu es dans ce territoire."
            : position && entry
              ? `Tu es à ${formatDistance(distanceMeters(position, entry))} à vol d'oiseau du territoire : le guidage t'emmène à son point le plus proche (en rouge sur la carte).`
              : `Le guidage t'emmène au centre du territoire.${locate.supported ? " Affiche ta position pour être guidé vers son point le plus proche." : ""}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <a href={links.google} target="_blank" rel="noopener noreferrer">
              Google Maps
            </a>
          </Button>
          {isAppleDevice() && (
            <Button asChild size="sm" variant="outline">
              <a href={links.apple} target="_blank" rel="noopener noreferrer">
                Plans
              </a>
            </Button>
          )}
          {travelMode === "driving" && (
            <Button asChild size="sm" variant="outline">
              <a href={links.waze} target="_blank" rel="noopener noreferrer">
                Waze
              </a>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
