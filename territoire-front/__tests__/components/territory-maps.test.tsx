import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TerritoryMap, {
  getBadgeColorTerritory,
} from "@/components/territory/territory-map";
import TerritoryIdMap from "@/components/territory/id/territory-id-map";
import { layers } from "../mocks/leaflet-dynamic";
import {
  jsonResponse,
  mockApi,
  renderWithStore,
  TEST_CITY,
} from "../test-utils";
import { Territory, TerritoryCollection } from "@/models/territory";

vi.mock("next/dynamic", () => import("../mocks/leaflet-dynamic"));
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ state: "expanded" }),
}));
vi.mock("@/components/territory/map-updater", () => ({ default: () => null }));
vi.mock("@/components/territory/id/geoman-controls", () => ({
  GeomanControl: () => null,
}));

// Carte d'édition : react-leaflet simulé (la carte appelle whenReady avec une carte factice)
const fakeMap = {
  handlers: {} as Record<string, (e: unknown) => void>,
  on: vi.fn(),
  fitBounds: vi.fn(),
};
fakeMap.on.mockImplementation(
  (event: string, handler: (e: unknown) => void) => {
    fakeMap.handlers[event] = handler;
  }
);
vi.mock("react-leaflet", async () => {
  const { fakeLayer } = await import("../mocks/leaflet-dynamic");
  const React = await import("react");
  const Overlay = ({
    children,
    name,
  }: {
    children: React.ReactNode;
    name: string;
  }) => <div data-overlay={name}>{children}</div>;
  const LayersControl = Object.assign(
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    {
      Overlay,
    }
  );
  return {
    MapContainer: ({
      children,
      whenReady,
    }: {
      children: React.ReactNode;
      whenReady: (e: unknown) => void;
    }) => {
      React.useEffect(() => whenReady({ target: fakeMap }), [whenReady]);
      return <div data-testid="edit-map">{children}</div>;
    },
    TileLayer: () => null,
    LayerGroup: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    LayersControl,
    GeoJSON: ({
      data,
      onEachFeature,
    }: {
      data: { features: unknown[] };
      onEachFeature?: (f: unknown, l: unknown) => void;
    }) => {
      data.features.forEach((feature) => onEachFeature?.(feature, fakeLayer()));
      return <div data-testid="geojson">{data.features.length}</div>;
    },
  };
});

const polygon = (offset = 0) => ({
  type: "Polygon",
  coordinates: [
    [
      [-1.68 + offset, 48.11],
      [-1.66 + offset, 48.11],
      [-1.66 + offset, 48.13],
      [-1.68 + offset, 48.11],
    ],
  ],
});

describe("Carte des territoires", () => {
  const collection: TerritoryCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: polygon() as never,
        properties: { id: "t1", name: "R-12", status: "LATE" } as never,
      },
      {
        type: "Feature",
        geometry: {
          type: "MultiPolygon",
          coordinates: [polygon(0.01).coordinates],
        } as never,
        properties: {
          id: "t2",
          name: "R-13",
          status: "AVAILABLE",
          territoryMapId: "t2",
        } as never,
      },
      {
        type: "Feature",
        geometry: null as never,
        properties: {
          id: "t3",
          name: "Sans forme",
          status: "PENDING",
        } as never,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    layers.length = 0;
  });

  it("colore chaque territoire selon son statut et centre la carte", () => {
    renderWithStore(<TerritoryMap geoJsonData={collection} />);

    const leaflet = screen.getAllByTestId("leaflet");
    const styles = JSON.parse(leaflet.at(-1)!.getAttribute("data-styles")!);
    expect(styles.map((s: { fillColor: string }) => s.fillColor)).toEqual([
      "#ec4899",
      "#9333ea",
      "#0ea5e9",
    ]);
    const [lat, lng] = JSON.parse(leaflet[0].getAttribute("data-center")!);
    expect(lat).toBeGreaterThan(48.1);
    expect(lng).toBeLessThan(-1.6);
  });

  it("centre la carte par défaut sans géométrie", () => {
    renderWithStore(
      <TerritoryMap geoJsonData={{ type: "FeatureCollection", features: [] }} />
    );

    expect(
      JSON.parse(
        screen.getAllByTestId("leaflet")[0].getAttribute("data-center")!
      )
    ).toEqual([48.695874, 2.367055]);
  });

  it("construit un popup sûr pour chaque territoire et y insère les actions à l'ouverture", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApi({ "GET /api/personnes": [] });
    renderWithStore(<TerritoryMap geoJsonData={collection} />);

    const layer = layers[0];
    expect((layer.popup as HTMLElement).querySelector("h2")?.textContent).toBe(
      "R-12"
    );
    document.body.appendChild(layer.popup as HTMLElement);
    const popup = { update: vi.fn() };
    await act(async () => layer.handlers.popupopen({ popup }));
    act(() => vi.advanceTimersByTime(150));

    expect(popup.update).toHaveBeenCalled();
    expect(
      await screen.findByRole("link", { name: "Voir les détails" })
    ).toHaveAttribute("href", "/territoires/t1");
    vi.useRealTimers();
  });

  it("agrandit et réduit la carte", async () => {
    renderWithStore(<TerritoryMap geoJsonData={collection} />);

    await userEvent.click(screen.getByTitle("Agrandir la carte"));
    await userEvent.click(screen.getByTitle("Réduire la carte"));

    expect(screen.getByTitle("Agrandir la carte")).toBeInTheDocument();
  });

  it("utilise une couleur par défaut pour un statut inconnu", () => {
    expect(getBadgeColorTerritory("INCONNU" as never)).toBe("#6b7280");
  });
});

describe("Carte d'édition d'un territoire", () => {
  const hull = {
    type: "Feature",
    properties: { type: "CONCAVE_HULL", id: null },
    geometry: { type: "MultiPolygon", coordinates: [polygon().coordinates] },
  };
  const block = (id: string) => ({
    type: "Feature",
    properties: { type: "BLOCK", id },
    geometry: polygon(),
  });
  const territory = (features: unknown[]): Territory =>
    ({
      id: "t1",
      name: "R-12",
      city: TEST_CITY,
      geojson: JSON.stringify({ type: "FeatureCollection", features }),
    }) as Territory;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    fakeMap.handlers = {};
    fakeMap.fitBounds.mockClear();
    layers.length = 0;
  });

  it("affiche le contour et les pâtés, et cadre la carte sur le contour", async () => {
    renderWithStore(
      <TerritoryIdMap
        territory={territory([hull, block("b1"), block("b2")])}
        city={TEST_CITY}
      />
    );

    await waitFor(() =>
      expect(
        screen.getAllByTestId("geojson").map((g) => g.textContent)
      ).toEqual(["1", "2"])
    );
    expect(fakeMap.fitBounds).toHaveBeenCalledWith([
      [48.11, -1.68],
      [48.13, -1.66],
    ]);
  });

  it("se cadre sur le centre de la ville sans contour", async () => {
    renderWithStore(
      <TerritoryIdMap territory={territory([])} city={TEST_CITY} />
    );

    await waitFor(() =>
      expect(fakeMap.fitBounds).toHaveBeenCalledWith([
        [48.11, -1.67],
        [48.11, -1.67],
      ])
    );
  });

  it("enregistre un pâté dessiné puis recharge le territoire", async () => {
    const api = mockApi({
      "POST /api/territoires/t1/pate": {},
      "GET /api/territoires/t1": { id: "t1" },
    });
    renderWithStore(
      <TerritoryIdMap territory={territory([])} city={TEST_CITY} />
    );
    await waitFor(() => expect(fakeMap.handlers["pm:create"]).toBeDefined());

    const drawn = {
      getLatLngs: () => [
        [
          { lat: 48.1, lng: -1.6 },
          { lat: 48.2, lng: -1.7 },
        ],
      ],
      remove: vi.fn(),
    };
    await act(async () => fakeMap.handlers["pm:create"]({ layer: drawn }));

    const post = api.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(post[0]).toBe("/api/territoires/t1/pate");
    expect(JSON.parse(String(post[1]?.body))).toEqual({
      coordinates: [
        [
          [-1.6, 48.1],
          [-1.7, 48.2],
        ],
      ],
    });
    expect(drawn.remove).toHaveBeenCalled();
    expect(api).toHaveBeenCalledWith("/api/territoires/t1");
  });

  it("journalise l'échec de l'enregistrement d'un pâté et ignore une forme invalide", async () => {
    mockApi({
      "POST /api/territoires/t1/pate": jsonResponse("Polygone invalide", 400),
    });
    renderWithStore(
      <TerritoryIdMap territory={territory([])} city={TEST_CITY} />
    );
    await waitFor(() => expect(fakeMap.handlers["pm:create"]).toBeDefined());

    await act(async () => fakeMap.handlers["pm:create"]({ layer: {} }));
    const drawn = {
      getLatLngs: () => [[{ lat: 48.1, lng: -1.6 }]],
      remove: vi.fn(),
    };
    await act(async () => fakeMap.handlers["pm:create"]({ layer: drawn }));

    expect(console.error).toHaveBeenCalledWith(
      "❌ Erreur lors de l'ajout du bloc :",
      expect.stringContaining("Polygone invalide")
    );
    expect(drawn.remove).not.toHaveBeenCalled();
  });

  it("supprime un pâté depuis son popup", async () => {
    const api = mockApi({
      "DELETE /api/territoires/t1/pate/b1": {},
      "GET /api/territoires/t1": { id: "t1" },
    });
    renderWithStore(
      <TerritoryIdMap territory={territory([block("b1")])} city={TEST_CITY} />
    );
    await waitFor(() => expect(layers.length).toBeGreaterThan(0));

    const layer = layers.at(-1)!;
    const holder = document.createElement("div");
    holder.innerHTML = layer.popup as string;
    document.body.appendChild(holder);
    act(() => layer.handlers.popupopen({}));
    await userEvent.click(screen.getByText("Supprimer"));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/api/territoires/t1/pate/b1", {
        method: "DELETE",
      })
    );
    expect(layer.remove).toHaveBeenCalled();
    holder.remove();
  });

  it("journalise l'échec de la suppression d'un pâté", async () => {
    mockApi({
      "DELETE /api/territoires/t1/pate/b1": jsonResponse("Introuvable", 404),
    });
    renderWithStore(
      <TerritoryIdMap territory={territory([block("b1")])} city={TEST_CITY} />
    );
    await waitFor(() => expect(layers.length).toBeGreaterThan(0));

    const layer = layers.at(-1)!;
    const holder = document.createElement("div");
    holder.innerHTML = layer.popup as string;
    document.body.appendChild(holder);
    act(() => layer.handlers.popupopen({}));
    await userEvent.click(screen.getByText("Supprimer"));

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "❌ Erreur lors de la suppression du bloc :",
        expect.stringContaining("Introuvable")
      )
    );
    holder.remove();
  });

  it("signale un GeoJSON illisible", () => {
    expect(() =>
      renderWithStore(
        <TerritoryIdMap
          territory={{ ...territory([]), geojson: "pas du json" }}
          city={TEST_CITY}
        />
      )
    ).toThrow();
    expect(console.error).toHaveBeenCalledWith(
      "❌ Erreur lors de la conversion de `geojson` :",
      expect.any(SyntaxError)
    );
  });
});
