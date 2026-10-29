import type { Feature, FeatureCollection, Geometry, Position } from "geojson";

export type LatLng = { lat: number; lng: number };

/**
 * Centre d'une carte de territoires : moyenne des sommets extérieurs de leurs polygones,
 * en [latitude, longitude] comme l'attend Leaflet. `fallback` sans polygone.
 */
export function geoJsonCenter<G extends Geometry | null, P>(
  collection: FeatureCollection<G, P> | null | undefined,
  fallback: [number, number]
): [number, number] {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  const addRing = (ring: Position[]) => {
    ring.forEach(([lng, lat]) => {
      sumLat += lat;
      sumLng += lng;
      count++;
    });
  };

  collection?.features.forEach((feature) => {
    const geometry = feature.geometry;
    if (geometry?.type === "Polygon") {
      addRing(geometry.coordinates[0]);
    } else if (geometry?.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => addRing(polygon[0]));
    }
  });

  return count > 0 ? [sumLat / count, sumLng / count] : fallback;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distance à vol d'oiseau en mètres (formule de haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** « 350 m », « 1,2 km », « 15 km ». */
export function formatDistance(meters: number): string {
  const rounded = Math.round(meters / 10) * 10;
  if (rounded < 1000) return `${rounded} m`;
  const km = meters / 1000;
  return `${km.toLocaleString("fr-FR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

/** Anneaux [lng, lat] des polygones (Polygon et MultiPolygon), chaque polygone gardant son contour puis ses trous. */
function polygonsOf(features: Feature[]): Position[][][] {
  return features.flatMap((f) => {
    const g = f.geometry;
    if (g?.type === "Polygon") return [g.coordinates];
    if (g?.type === "MultiPolygon") return g.coordinates;
    return [];
  });
}

function insideRing(point: LatLng, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Le point est-il dans l'un des polygones (hors trous) ? */
export function isInside(point: LatLng, features: Feature[]): boolean {
  return polygonsOf(features).some(
    ([outer, ...holes]) =>
      outer !== undefined &&
      insideRing(point, outer) &&
      !holes.some((hole) => insideRing(point, hole))
  );
}

/**
 * Point des contours le plus proche de `point`. Calcul en projection locale (équirectangulaire), largement
 * suffisante à l'échelle d'une ville.
 */
export function nearestPointOnOutline(
  point: LatLng,
  features: Feature[]
): LatLng | null {
  const kx = Math.cos(toRad(point.lat));
  let best: LatLng | null = null;
  let bestDistance = Infinity;
  for (const ring of polygonsOf(features).flat()) {
    for (let i = 0; i < ring.length - 1; i++) {
      // Coordonnées locales relatives au point, en degrés de latitude
      const ax = (ring[i][0] - point.lng) * kx;
      const ay = ring[i][1] - point.lat;
      const bx = (ring[i + 1][0] - point.lng) * kx;
      const by = ring[i + 1][1] - point.lat;
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSq = dx * dx + dy * dy;
      const t =
        lengthSq === 0
          ? 0
          : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
      const x = ax + t * dx;
      const y = ay + t * dy;
      const distance = x * x + y * y;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { lat: point.lat + y, lng: point.lng + x / kx };
      }
    }
  }
  return best;
}

export type TravelMode = "driving" | "walking";

/** Liens qui ouvrent directement le guidage, depuis la position actuelle, dans les applications de navigation. */
export function directionsLinks(destination: LatLng, mode: TravelMode) {
  const coords = `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${coords}&travelmode=${mode}`,
    apple: `https://maps.apple.com/?daddr=${coords}&dirflg=${mode === "walking" ? "w" : "d"}`,
    waze: `https://waze.com/ul?ll=${coords}&navigate=yes`,
  };
}
