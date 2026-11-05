import type { Feature } from "geojson";
import {
  distanceMeters,
  isInside,
  LatLng,
  nearestPointOnOutline,
} from "@/lib/geo";

/**
 * Géocodage de la Géoplateforme (IGN), service public et gratuit, sans clé : il prend la suite de
 * api-adresse.data.gouv.fr (Base Adresse Nationale) et répond en GeoJSON. Appelé depuis le navigateur
 * (cf. connect-src de next.config.ts) : seule l'adresse tapée part chez l'IGN, rien d'autre de TMS.
 */
export const GEOCODING_URL = "https://data.geopf.fr/geocodage/search";

/** En dessous, le service refuse la recherche. */
export const ADDRESS_MIN_LENGTH = 3;

export type AddressResult = LatLng & {
  /** Adresse complète, ex. « 12 Rue Victor Hugo 91550 Paray-Vieille-Poste ». */
  label: string;
  /** Détail de l'adresse, quand le service le donne (« 12 », « Rue Victor Hugo », « 91550 », « Paray-Vieille-Poste »). */
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
};

type GeocodingFeature = {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
};

const DETAILS = ["housenumber", "street", "postcode", "city"] as const;

/**
 * Adresses correspondant à la recherche, les plus proches de `near` d'abord (centre des territoires).
 * Lève une erreur au message affichable si le service ne répond pas.
 */
export async function searchAddresses(
  query: string,
  near?: LatLng | null,
  signal?: AbortSignal
): Promise<AddressResult[]> {
  const q = query.trim();
  if (q.length < ADDRESS_MIN_LENGTH) return [];
  const params = new URLSearchParams({ q, index: "address", limit: "5" });
  if (near) {
    params.set("lat", near.lat.toFixed(5));
    params.set("lon", near.lng.toFixed(5));
  }

  let response: Response;
  try {
    response = await fetch(`${GEOCODING_URL}?${params}`, {
      signal,
      credentials: "omit",
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new Error("Recherche d'adresse impossible : vérifiez votre réseau");
  }
  if (!response.ok) {
    throw new Error("Le service d'adresses ne répond pas, réessayez plus tard");
  }

  const body = (await response.json()) as { features?: GeocodingFeature[] };
  return (body.features ?? []).flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    const label = feature.properties?.label;
    if (
      feature.geometry?.type !== "Point" ||
      !Array.isArray(coordinates) ||
      typeof coordinates[0] !== "number" ||
      typeof coordinates[1] !== "number" ||
      typeof label !== "string"
    ) {
      return [];
    }
    const details = Object.fromEntries(
      DETAILS.flatMap((key) => {
        const value = feature.properties?.[key];
        return typeof value === "string" && value ? [[key, value]] : [];
      })
    );
    return [{ label, lng: coordinates[0], lat: coordinates[1], ...details }];
  });
}

/** Territoire voisin d'une adresse, à `distance` mètres de son contour. */
export type NearbyTerritory<F extends Feature> = {
  feature: F;
  distance: number;
};

/** Au-delà, un territoire n'est plus « proche » d'une adresse qui n'est dans aucun. */
const NEARBY_OUTSIDE_METERS = 500;
/** Adresse dans un territoire : on signale aussi ceux de l'autre côté de la rue. */
const NEARBY_INSIDE_METERS = 60;
const NEARBY_MAX = 3;

/**
 * Territoires d'une adresse : celui (ou ceux) qui la contiennent, puis les plus proches, du plus près au plus
 * loin. Utile quand l'adresse tombe sur la chaussée, juste hors d'un pâté, ou au bord de deux territoires.
 */
export function territoriesAtPoint<F extends Feature>(
  point: LatLng,
  features: readonly F[]
): { containing: F[]; nearby: NearbyTerritory<F>[] } {
  const containing = features.filter(
    (feature) => feature.geometry && isInside(point, [feature])
  );
  const radius =
    containing.length > 0 ? NEARBY_INSIDE_METERS : NEARBY_OUTSIDE_METERS;
  const nearby = features
    .filter((feature) => feature.geometry && !containing.includes(feature))
    .flatMap((feature) => {
      const closest = nearestPointOnOutline(point, [feature]);
      if (!closest) return [];
      const distance = distanceMeters(point, closest);
      return distance <= radius ? [{ feature, distance }] : [];
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, NEARBY_MAX);
  return { containing, nearby };
}
