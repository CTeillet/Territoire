import { describe, it, expect } from "vitest";
import type { Feature } from "geojson";
import {
  directionsLinks,
  distanceMeters,
  formatDistance,
  isInside,
  nearestPointOnOutline,
} from "@/lib/geo";

const polygon = (...rings: number[][][]): Feature => ({
  type: "Feature",
  properties: {},
  geometry: { type: "Polygon", coordinates: rings },
});

// Carré de 0,02° autour de (48.12, -1.67), percé d'un trou central
const outer = [
  [-1.68, 48.11],
  [-1.66, 48.11],
  [-1.66, 48.13],
  [-1.68, 48.13],
  [-1.68, 48.11],
];
const hole = [
  [-1.672, 48.118],
  [-1.668, 48.118],
  [-1.668, 48.122],
  [-1.672, 48.122],
  [-1.672, 48.118],
];

describe("geo", () => {
  it("mesure les distances à vol d'oiseau", () => {
    // Rennes → Paris : ~308 km
    const d = distanceMeters(
      { lat: 48.1173, lng: -1.6778 },
      { lat: 48.8566, lng: 2.3522 }
    );
    expect(d).toBeGreaterThan(305_000);
    expect(d).toBeLessThan(311_000);
  });

  it.each([
    [42, "40 m"],
    [999, "1 km"],
    [1337, "1,3 km"],
    [15_400, "15 km"],
  ])("formate %d m en « %s » (espaces insécables normalisées)", (meters, text) => {
    expect(formatDistance(meters).replace(/\s/g, " ")).toBe(text);
  });

  it("sait si un point est dans un polygone, hors des trous", () => {
    const features = [polygon(outer, hole)];

    expect(isInside({ lat: 48.112, lng: -1.67 }, features)).toBe(true);
    expect(isInside({ lat: 48.12, lng: -1.67 }, features)).toBe(false);
    expect(isInside({ lat: 48.2, lng: -1.67 }, features)).toBe(false);
  });

  it("gère les multipolygones et ignore les autres géométries", () => {
    const features: Feature[] = [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "MultiPolygon", coordinates: [[outer]] },
      },
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [0, 0] },
      },
    ];

    expect(isInside({ lat: 48.12, lng: -1.67 }, features)).toBe(true);
    const nearest = nearestPointOnOutline({ lat: 48.12, lng: -1.7 }, features)!;
    expect(nearest.lat).toBeCloseTo(48.12, 9);
    expect(nearest.lng).toBeCloseTo(-1.68, 9);
  });

  it("trouve le point du contour le plus proche, sur un côté ou un coin", () => {
    const features = [polygon(outer)];

    const side = nearestPointOnOutline({ lat: 48.12, lng: -1.65 }, features)!;
    expect(side.lat).toBeCloseTo(48.12, 9);
    expect(side.lng).toBeCloseTo(-1.66, 9);

    const corner = nearestPointOnOutline({ lat: 48.1, lng: -1.69 }, features)!;
    expect(corner.lat).toBeCloseTo(48.11, 9);
    expect(corner.lng).toBeCloseTo(-1.68, 9);
  });

  it("n'a pas de point le plus proche sans géométrie", () => {
    expect(nearestPointOnOutline({ lat: 48, lng: -1 }, [])).toBeNull();
  });

  it("construit les liens de guidage selon le mode", () => {
    const destination = { lat: 48.1234567, lng: -1.6 };

    expect(directionsLinks(destination, "walking")).toEqual({
      google:
        "https://www.google.com/maps/dir/?api=1&destination=48.123457,-1.600000&travelmode=walking",
      apple: "https://maps.apple.com/?daddr=48.123457,-1.600000&dirflg=w",
      waze: "https://waze.com/ul?ll=48.123457,-1.600000&navigate=yes",
    });
    expect(directionsLinks(destination, "driving").apple).toContain("dirflg=d");
  });
});
