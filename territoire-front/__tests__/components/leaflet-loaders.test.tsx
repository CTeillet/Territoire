import { describe, it, expect, vi } from "vitest";
import * as ReactLeaflet from "react-leaflet";
import { MapBackground } from "@/components/map/ign-base-layer";
import { loaders } from "../mocks/leaflet-dynamic";
import "@/components/territory/territory-map";
import "@/components/campaigns/campaign-map";
import "@/components/dashboard/territory-coverage-map";

vi.mock("next/dynamic", () => import("../mocks/leaflet-dynamic"));

describe("Chargement différé de react-leaflet", () => {
  it("chaque carte charge les vrais composants MapContainer, GeoJSON et son fond IGN", async () => {
    // 3 cartes × 3 composants, plus le repère d'adresse de la carte des territoires (point et infobulle)
    expect(loaders).toHaveLength(11);

    const components = await Promise.all(loaders.map((load) => load()));

    expect(components.every(Boolean)).toBe(true);
    for (const expected of [
      ReactLeaflet.MapContainer,
      ReactLeaflet.GeoJSON,
      MapBackground,
    ]) {
      expect(components.filter((c) => c === expected)).toHaveLength(3);
    }
    expect(components).toContain(ReactLeaflet.CircleMarker);
    expect(components).toContain(ReactLeaflet.Tooltip);
  });
});
