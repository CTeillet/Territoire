import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { FeatureCollection, Geometry } from "geojson";
import MapFitBounds from "@/components/territory/map-fit-bounds";

// Comme dans react-leaflet, la même carte à chaque rendu
const { fitBounds, map } = vi.hoisted(() => {
  const fitBounds = vi.fn();
  return { fitBounds, map: { fitBounds } };
});
vi.mock("react-leaflet", () => ({ useMap: () => map }));

const square = (lng: number, lat: number) => ({
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "Polygon" as const,
    coordinates: [
      [
        [lng, lat],
        [lng + 0.01, lat],
        [lng + 0.01, lat + 0.01],
        [lng, lat],
      ],
    ],
  },
});

const collection = (
  ...features: ReturnType<typeof square>[]
): FeatureCollection<Geometry | null, unknown> => ({
  type: "FeatureCollection",
  features,
});

describe("MapFitBounds", () => {
  beforeEach(() => fitBounds.mockClear());

  it("cadre la carte sur les territoires affichés", () => {
    render(
      <MapFitBounds
        data={collection(square(-1.7, 48.1), square(-1.6, 48.2))}
        selectionKey="a,b"
      />
    );
    expect(fitBounds).toHaveBeenCalledWith(
      [
        [48.1, -1.7],
        [48.21, -1.59],
      ],
      { padding: [30, 30], maxZoom: 17 }
    );
  });

  it("ne recadre que si la sélection change, pas à chaque mise à jour des données", () => {
    const { rerender } = render(
      <MapFitBounds data={collection(square(-1.7, 48.1))} selectionKey="a" />
    );
    rerender(
      <MapFitBounds data={collection(square(-1.7, 48.1))} selectionKey="a" />
    );
    expect(fitBounds).toHaveBeenCalledTimes(1);

    rerender(
      <MapFitBounds data={collection(square(-1.6, 48.2))} selectionKey="b" />
    );
    expect(fitBounds).toHaveBeenCalledTimes(2);
  });

  it("ne fait rien sans territoire à montrer (aucun résultat)", () => {
    render(<MapFitBounds data={collection()} selectionKey="" />);
    expect(fitBounds).not.toHaveBeenCalled();
  });
});
