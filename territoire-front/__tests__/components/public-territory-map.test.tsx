import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LatLngBounds } from "leaflet";
import PublicTerritoryMap from "@/components/public-access/public-territory-map";

const fitBounds = vi.fn();

// react-leaflet a besoin d'un vrai rendu cartographique : on vérifie seulement ce qu'on lui transmet
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tiles" />,
  GeoJSON: ({ data }: { data: { features: unknown[] } }) => (
    <div data-testid="layer">{data.features.length}</div>
  ),
  Circle: ({ radius }: { radius: number }) => (
    <div data-testid="accuracy">{radius}</div>
  ),
  CircleMarker: ({ center }: { center: [number, number] }) => (
    <div data-testid="me">{center.join(",")}</div>
  ),
  useMap: () => ({ fitBounds }),
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

describe("PublicTerritoryMap : ma position", () => {
  type Success = (p: {
    coords: { latitude: number; longitude: number; accuracy: number };
  }) => void;
  type Failure = (e: { code: number }) => void;
  let onSuccess: Success;
  let onError: Failure;
  const watchPosition = vi.fn((success: Success, error: Failure) => {
    onSuccess = success;
    onError = error;
    return 7;
  });
  const clearWatch = vi.fn();

  const fix = (latitude: number, longitude: number, accuracy = 15) =>
    act(() => onSuccess({ coords: { latitude, longitude, accuracy } }));

  const renderMap = () =>
    render(<PublicTerritoryMap geojson={collection(square("CONCAVE_HULL"))} />);

  beforeEach(() => {
    fitBounds.mockClear();
    watchPosition.mockClear();
    clearWatch.mockClear();
    Object.defineProperty(navigator, "geolocation", {
      value: { watchPosition, clearWatch },
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup(); // démonte (et coupe le suivi) avant de retirer la géolocalisation simulée
    // jsdom n'implémente pas la géolocalisation
    delete (navigator as { geolocation?: unknown }).geolocation;
  });

  it("n'affiche le bouton que si le navigateur sait localiser", () => {
    delete (navigator as { geolocation?: unknown }).geolocation;
    renderMap();

    expect(
      screen.queryByRole("button", { name: "Afficher ma position" })
    ).not.toBeInTheDocument();
  });

  it("ne demande la position qu'à la demande, puis affiche le point et la précision", async () => {
    renderMap();
    expect(watchPosition).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "Afficher ma position" })
    );
    expect(watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true })
    );
    expect(screen.getByText("Localisation en cours…")).toBeInTheDocument();

    fix(48.1, -1.69, 25);

    expect(screen.getByTestId("me")).toHaveTextContent("48.1,-1.69");
    expect(screen.getByTestId("accuracy")).toHaveTextContent("25");
    expect(
      screen.queryByText("Localisation en cours…")
    ).not.toBeInTheDocument();
  });

  it("cadre une seule fois sur le territoire et la personne, puis la laisse déplacer la carte", async () => {
    renderMap();
    await userEvent.click(
      screen.getByRole("button", { name: "Afficher ma position" })
    );

    fix(48.1, -1.69);
    expect(fitBounds).toHaveBeenCalledTimes(1);
    const bounds = fitBounds.mock.calls[0][0] as LatLngBounds;
    expect(bounds.contains([48.1, -1.69])).toBe(true);
    expect(bounds.contains([48.13, -1.66])).toBe(true);

    fix(48.101, -1.689);
    expect(screen.getByTestId("me")).toHaveTextContent("48.101,-1.689");
    expect(fitBounds).toHaveBeenCalledTimes(1);
  });

  it("arrête le suivi et recadre à la réactivation", async () => {
    renderMap();
    await userEvent.click(
      screen.getByRole("button", { name: "Afficher ma position" })
    );
    fix(48.1, -1.69);

    await userEvent.click(
      screen.getByRole("button", { name: "Masquer ma position" })
    );
    expect(clearWatch).toHaveBeenCalledWith(7);
    expect(screen.queryByTestId("me")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Afficher ma position" })
    );
    fix(48.12, -1.67);
    expect(fitBounds).toHaveBeenCalledTimes(2);
  });

  it("explique un refus d'autorisation et revient au bouton de départ", async () => {
    renderMap();
    await userEvent.click(
      screen.getByRole("button", { name: "Afficher ma position" })
    );

    act(() => onError({ code: 1 }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Localisation refusée"
    );
    expect(clearWatch).toHaveBeenCalledWith(7);
    expect(
      screen.getByRole("button", { name: "Afficher ma position" })
    ).toBeInTheDocument();
  });

  it.each([
    [2, "Position introuvable pour le moment."],
    [3, "La localisation prend trop de temps, réessaie."],
    [99, "Impossible de te localiser."],
  ])("signale l'erreur %i sans arrêter le suivi", async (code, message) => {
    renderMap();
    await userEvent.click(
      screen.getByRole("button", { name: "Afficher ma position" })
    );

    act(() => onError({ code }));

    expect(screen.getByRole("status")).toHaveTextContent(message);
    expect(
      screen.getByRole("button", { name: "Masquer ma position" })
    ).toBeInTheDocument();

    fix(48.12, -1.67);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("coupe le GPS en quittant la page", async () => {
    const { unmount } = renderMap();
    await userEvent.click(
      screen.getByRole("button", { name: "Afficher ma position" })
    );

    unmount();

    expect(clearWatch).toHaveBeenCalledWith(7);
  });
});
