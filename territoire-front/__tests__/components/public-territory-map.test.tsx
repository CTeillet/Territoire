import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicTerritoryMap from "@/components/public-access/public-territory-map";

// react-leaflet a besoin d'un vrai rendu cartographique : on vérifie seulement ce qu'on lui transmet
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tiles" />,
  GeoJSON: ({ data }: { data: { features: unknown[] } }) => (
    <div data-testid="layer">{data.features.length}</div>
  ),
}));

const square = (type: "BLOCK" | "CONCAVE_HULL") => ({
  type: "Feature",
  properties: { type },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-1.68, 48.11],
        [-1.66, 48.11],
        [-1.66, 48.13],
        [-1.68, 48.13],
        [-1.68, 48.11],
      ],
    ],
  },
});

const collection = (...features: unknown[]) =>
  JSON.stringify({ type: "FeatureCollection", features });

describe("PublicTerritoryMap", () => {
  it("affiche le contour et les pâtés, avec un lien de navigation vers le centre", () => {
    render(
      <PublicTerritoryMap
        geojson={collection(
          square("BLOCK"),
          square("BLOCK"),
          square("CONCAVE_HULL")
        )}
      />
    );

    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.getAllByTestId("layer").map((l) => l.textContent)).toEqual([
      "2",
      "1",
    ]);
    expect(
      screen.getByText("Ouvrir dans une application de navigation")
    ).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=48.120000,-1.670000"
    );
  });

  it("se cadre sur les pâtés quand il n'y a pas encore de contour", () => {
    render(<PublicTerritoryMap geojson={collection(square("BLOCK"))} />);

    expect(screen.getByTestId("map")).toBeInTheDocument();
  });

  it("indique l'absence de carte pour un territoire sans géométrie", () => {
    render(<PublicTerritoryMap geojson={collection()} />);

    expect(
      screen.getByText("Pas encore de carte pour ce territoire.")
    ).toBeInTheDocument();
  });

  it("résiste à un GeoJSON illisible", () => {
    render(<PublicTerritoryMap geojson="pas du json" />);

    expect(
      screen.getByText("Pas encore de carte pour ce territoire.")
    ).toBeInTheDocument();
  });
});
