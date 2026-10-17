import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampaignStatisticsComponent } from "@/components/campaigns/campaign-statistics";
import CampaignMap from "@/components/campaigns/campaign-map";
import MapUpdater from "@/components/territory/map-updater";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "toast-id") },
}));
vi.mock("file-saver", () => ({ saveAs: vi.fn() }));
vi.mock("recharts", async (importOriginal) =>
  (await import("../mocks/recharts")).rechartsWithFixedSize(
    importOriginal as never
  )
);
vi.mock("next/dynamic", () => import("../mocks/leaflet-dynamic"));
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ state: "expanded" }),
}));
const invalidateSize = vi.fn();
vi.mock("react-leaflet", () => ({ useMap: () => ({ invalidateSize }) }));

const statistics = {
  campaignId: "c1",
  campaignName: "Campagne d'automne",
  totalTerritories: 10,
  usedTerritories: 6,
  availableTerritories: 4,
  totalTerritoriesByType: { BUILDING: 4, HOUSE: 6 },
  usedTerritoriesByType: { BUILDING: 3 },
  availableTerritoriesByType: { BUILDING: 1, HOUSE: 3 },
  totalTerritoriesByCity: { Rennes: 7, Cesson: 3 },
  usedTerritoriesByCity: { Rennes: 5 },
  availableTerritoriesByCity: { Rennes: 2, Cesson: 3 },
};

describe("Statistiques d'une campagne", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(saveAs).mockClear();
  });

  it("affiche le résumé, les graphiques et les détails par type et par ville", async () => {
    mockApi({ "GET /api/campagnes/c1/statistiques": statistics });
    renderWithStore(<CampaignStatisticsComponent campaignId="c1" />);

    expect(
      await screen.findByText(
        "Statistiques des territoires pour cette campagne"
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Utilisés").length).toBeGreaterThan(0);

    await userEvent.click(
      screen.getByRole("tab", { name: "Détails par type" })
    );
    expect(await screen.findByText("Immeubles")).toBeInTheDocument();
    expect(screen.getByText("Pavillons")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("tab", { name: "Détails par ville" })
    );
    expect(await screen.findByText("Cesson")).toBeInTheDocument();
  });

  it("exporte les statistiques en Excel", async () => {
    mockApi({
      "GET /api/campagnes/c1/statistiques": statistics,
      "GET /api/campagnes/c1/export/excel": {},
    });
    renderWithStore(<CampaignStatisticsComponent campaignId="c1" />);

    await userEvent.click(await screen.findByText("Exporter en Excel"));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Export Excel terminé", {
        id: "toast-id",
      })
    );
    expect(saveAs).toHaveBeenCalled();
  });

  it("signale l'échec de l'export", async () => {
    mockApi({
      "GET /api/campagnes/c1/statistiques": statistics,
      "GET /api/campagnes/c1/export/excel": jsonResponse({}, 500),
    });
    renderWithStore(<CampaignStatisticsComponent campaignId="c1" />);

    await userEvent.click(await screen.findByText("Exporter en Excel"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la génération de l'export",
        { id: "toast-id" }
      )
    );
  });

  it("indique l'absence de statistiques", async () => {
    mockApi({ "GET /api/campagnes/c1/statistiques": jsonResponse({}, 500) });
    renderWithStore(<CampaignStatisticsComponent campaignId="c1" />);

    expect(
      await screen.findByText("Aucune statistique disponible")
    ).toBeInTheDocument();
  });

  it("indique le chargement en cours", () => {
    renderWithStore(<CampaignStatisticsComponent campaignId="c1" />, "ADMIN", {
      campaigns: { loadingStatistics: true },
    });

    expect(
      screen.getByText("Chargement des statistiques...")
    ).toBeInTheDocument();
  });
});

describe("Carte d'une campagne", () => {
  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "t1", type: "BUILDING" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-1.6, 48.1],
              [-1.7, 48.2],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: { id: "t2", type: "HOUSE" },
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [-1.6, 48.1],
                [-1.7, 48.2],
              ],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: { id: "t3", type: null },
        geometry: { type: "Point", coordinates: [0, 0] },
      },
    ],
  };

  const styles = () =>
    JSON.parse(
      screen.getAllByTestId("leaflet").at(-1)!.getAttribute("data-styles")!
    );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("colore les territoires utilisés et restants, puis par type", async () => {
    mockApi({ "GET /api/campagnes/c1/geojson": geojson });
    renderWithStore(
      <CampaignMap campaignId="c1" remainingTerritoryIds={["t2"]} />
    );

    await waitFor(() => expect(styles()).toHaveLength(3));
    expect(styles().map((s: { fillColor: string }) => s.fillColor)).toEqual([
      "#22c55e",
      "#ef4444",
      "#22c55e",
    ]);
    expect(screen.getByText("À faire")).toBeInTheDocument();
    // Centre calculé à partir des polygones (le point est ignoré)
    const [lat, lng] = JSON.parse(
      screen.getAllByTestId("leaflet")[0].getAttribute("data-center")!
    );
    expect(lat).toBeCloseTo(48.15);
    expect(lng).toBeCloseTo(-1.65);

    await userEvent.click(screen.getByText("Type (Immeuble/Pavillon)"));
    expect(styles().map((s: { fillColor: string }) => s.fillColor)).toEqual([
      "#3b82f6",
      "#f97316",
      "#94a3b8",
    ]);
    expect(styles()[0].fillOpacity).toBe(0.3);
    expect(
      screen.getByText("Opacité réduite = Déjà utilisé")
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText("Statut (Visité/Restant)"));
    expect(screen.getByText("Utilisé")).toBeInTheDocument();
  });

  it("agrandit et réduit la carte", async () => {
    mockApi({ "GET /api/campagnes/c1/geojson": geojson });
    renderWithStore(<CampaignMap campaignId="c1" remainingTerritoryIds={[]} />);

    await userEvent.click(screen.getByTitle("Agrandir la carte"));
    await userEvent.click(screen.getByTitle("Réduire la carte"));

    expect(screen.getByTitle("Agrandir la carte")).toBeInTheDocument();
  });

  it("affiche le chargement et utilise le centre par défaut sans données", () => {
    renderWithStore(
      <CampaignMap campaignId="c1" remainingTerritoryIds={[]} />,
      "ADMIN",
      {
        campaigns: { loadingMap: true },
      }
    );

    expect(
      screen.getByText("Chargement des données de la carte...")
    ).toBeInTheDocument();
    expect(
      JSON.parse(
        screen.getAllByTestId("leaflet")[0].getAttribute("data-center")!
      )
    ).toEqual([48.695874, 2.367055]);
  });

  it("vide les données de la carte en quittant la page", async () => {
    mockApi({ "GET /api/campagnes/c1/geojson": geojson });
    const { store, unmount } = renderWithStore(
      <CampaignMap campaignId="c1" remainingTerritoryIds={[]} />
    );
    await waitFor(() =>
      expect(store.getState().campaigns.currentCampaignGeoJson).not.toBeNull()
    );

    unmount();

    expect(store.getState().campaigns.currentCampaignGeoJson).toBeNull();
  });
});

describe("MapUpdater", () => {
  it("recalcule la taille de la carte après un changement de mise en page", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    invalidateSize.mockClear();

    render(<MapUpdater isSidebarOpen />);
    vi.advanceTimersByTime(300);

    expect(invalidateSize).toHaveBeenCalled();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
