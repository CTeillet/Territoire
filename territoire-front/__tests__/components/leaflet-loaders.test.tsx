import { describe, it, expect, vi } from "vitest";
import * as ReactLeaflet from "react-leaflet";
import { loaders } from "../mocks/leaflet-dynamic";
import "@/components/territory/territory-map";
import "@/components/campaigns/campaign-map";
import "@/components/dashboard/territory-coverage-map";

vi.mock("next/dynamic", () => import("../mocks/leaflet-dynamic"));

describe("Chargement différé de react-leaflet", () => {
  it("chaque carte charge les vrais composants MapContainer, TileLayer et GeoJSON", async () => {
    // 3 cartes × 3 composants
    expect(loaders).toHaveLength(9);

    const components = await Promise.all(loaders.map((load) => load()));

    expect(components.every(Boolean)).toBe(true);
    for (const expected of [
      ReactLeaflet.MapContainer,
      ReactLeaflet.TileLayer,
      ReactLeaflet.GeoJSON,
    ]) {
      expect(components.filter((c) => c === expected)).toHaveLength(3);
    }
  });
});
