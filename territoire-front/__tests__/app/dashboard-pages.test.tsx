import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "@/app/(app)/page";
import StatistiquesPage from "@/app/(app)/statistiques/page";
import { StatisticsOverview } from "@/components/dashboard/statistics-overview";
import TerritoryCoverageMap from "@/components/dashboard/territory-coverage-map";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/dynamic", () => import("../mocks/leaflet-dynamic"));
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ state: "expanded" }),
}));
vi.mock("@/components/territory/map-updater", () => ({ default: () => null }));
vi.mock("recharts", async (importOriginal) =>
  (await import("../mocks/recharts")).rechartsWithFixedSize(
    importOriginal as never
  )
);

const feature = (id: string, status: string) => ({
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-1.6, 48.1],
        [-1.7, 48.2],
      ],
    ],
  },
  properties: { id, name: `T-${id}`, status },
});

const periodStatistics = {
  totalTerritories: 5,
  usedTerritories: 3,
  availableTerritories: 2,
  totalTerritoriesByType: { BUILDING: 2, HOUSE: 3 },
  usedTerritoriesByType: { BUILDING: 1, HOUSE: 2 },
  availableTerritoriesByType: { BUILDING: 1, HOUSE: 1 },
  totalTerritoriesByCity: { Rennes: 4, Cesson: 1 },
  usedTerritoriesByCity: { Rennes: 3 },
  availableTerritoriesByCity: { Rennes: 1, Cesson: 1 },
};

const routes = {
  "GET /api/territoires/geojson": {
    type: "FeatureCollection",
    features: [
      feature("1", "AVAILABLE"),
      feature("2", "ASSIGNED"),
      feature("3", "LATE"),
      feature("4", "PENDING"),
      feature("5", "ASSIGNED"),
    ],
  },
  "GET /api/territoires/statistiques/non-assignes-depuis": 2,
  "GET /api/settings/publishers-count": 4,
  "GET /api/territoires/statistiques/duree-moyenne-attribution/par-mois": [
    { period: "2026-01", averageDuration: 30.5 },
    { period: "2026-02", averageDuration: 45 },
  ],
  "GET /api/territoires/statistiques/duree-moyenne-attribution/globale": 42.25,
  "GET /api/territoires/statistiques/distribution-par-ville": [
    { cityName: "Rennes", territoryCount: 4, percentage: 80 },
    { cityName: "Cesson", territoryCount: 1, percentage: 20 },
  ],
  "GET /api/attributions/dernieres": [
    {
      id: "as1",
      territory: { territoryId: "2", name: "T-2", status: "ASSIGNED" },
      person: { id: "p1", firstName: "Jean", lastName: "Dupont" },
      assignmentDate: "2026-10-01",
      dueDate: "2027-02-01",
      returnDate: null,
    },
    {
      id: "as2",
      territory: { territoryId: "4", name: "T-4", status: "PENDING" },
      person: { id: "p2", firstName: "Anne", lastName: "Martin" },
      assignmentDate: "2026-06-01",
      dueDate: "2026-10-01",
      returnDate: "2026-10-05",
    },
  ],
  "GET /api/territoires/statistiques": [
    {
      date: "2026-10-01",
      availableTerritory: 2,
      assignedTerritory: 2,
      pendingTerritory: 1,
      lateTerritory: 0,
    },
    {
      date: "2026-10-02",
      availableTerritory: 1,
      assignedTerritory: 2,
      pendingTerritory: 1,
      lateTerritory: 1,
    },
  ],
  "GET /api/territoires/statistiques/resume-periode": periodStatistics,
  "GET /api/territoires/statistiques/carte-couverture": {
    type: "FeatureCollection",
    features: [
      { ...feature("1", "AVAILABLE"), properties: { id: "1", parcouru: true } },
      {
        type: "Feature",
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
        properties: { id: "2", parcouru: false },
      },
      {
        type: "Feature",
        geometry: null,
        properties: { id: "3", parcouru: false },
      },
    ],
  },
  "GET /api/territoires/statistiques/periodes": [
    {
      startYear: 2026,
      endYear: 2027,
      label: "2026 - 2027",
      startDate: "2026-09-01",
      endDate: "2027-08-31",
      current: true,
    },
    {
      startYear: 2025,
      endYear: 2026,
      label: "2025 - 2026",
      startDate: "2025-09-01",
      endDate: "2026-08-31",
      current: false,
    },
  ],
};

describe("Tableau de bord", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    push.mockClear();
  });

  it("affiche les indicateurs, les graphiques et les dernières attributions", async () => {
    mockApi(routes);
    renderWithStore(<Dashboard />);

    expect(screen.getByText("Dashboard des Territoires")).toBeInTheDocument();
    // 3 territoires en circulation pour 4 proclamateurs
    expect(await screen.findByText("0.75")).toBeInTheDocument();
    expect(screen.getByText("Territoires en circulation")).toBeInTheDocument();
    expect(
      await screen.findByText("Actualités des territoires")
    ).toBeInTheDocument();
    expect(await screen.findByText(/Jean Dupont/)).toBeInTheDocument();
    expect(screen.getByText("Durée moyenne d'attribution")).toBeInTheDocument();
    expect(screen.getByText("Distribution par ville")).toBeInTheDocument();
    expect(
      screen.getByText("Statistiques des territoires")
    ).toBeInTheDocument();
  });

  it("indique l'absence de données", async () => {
    mockApi({
      ...routes,
      "GET /api/territoires/statistiques/duree-moyenne-attribution/par-mois":
        [],
      "GET /api/territoires/statistiques/distribution-par-ville": [],
    });
    renderWithStore(<Dashboard />);

    await waitFor(() =>
      expect(
        screen.getAllByText("Aucune donnée pour cette période")
      ).toHaveLength(2)
    );
  });

  it("affiche l'erreur d'une statistique (partagée par tous les graphiques)", async () => {
    mockApi({
      ...routes,
      "GET /api/settings/publishers-count": jsonResponse({}, 500),
      "GET /api/territoires/statistiques/non-assignes-depuis": jsonResponse(
        {},
        500
      ),
    });
    renderWithStore(<Dashboard />);

    // Défaut connu : l'erreur est stockée une seule fois dans le slice et affichée par chaque graphique
    await waitFor(() =>
      expect(
        screen.getAllByText(
          "Erreur: Erreur lors de la récupération des territoires non assignés"
        ).length
      ).toBeGreaterThan(1)
    );
  });

  it("renvoie vers la connexion sans utilisateur connecté", async () => {
    mockApi(routes);
    renderWithStore(<Dashboard />, null);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(
      screen.queryByText("Dashboard des Territoires")
    ).not.toBeInTheDocument();
  });
});

describe("Page des statistiques", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    push.mockClear();
  });

  it("présélectionne l'année en cours et permet de changer de période", async () => {
    const api = mockApi(routes);
    renderWithStore(<StatistiquesPage />);

    expect(
      await screen.findByText(/du 01\/09\/2026 au 31\/08\/2027/)
    ).toBeInTheDocument();
    expect(screen.getByText("(Période en cours)")).toBeInTheDocument();
    expect(
      await screen.findByText("Statistiques détaillées")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Carte de couverture des territoires")
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(
      await screen.findByRole("option", { name: "2025 - 2026" })
    );

    expect(
      await screen.findByText(/du 01\/09\/2025 au 31\/08\/2026/)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Territoires parcourus (2025 - 2026)").length
    ).toBeGreaterThan(0);
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/api/territoires/statistiques/non-assignes-depuis?startDate=2025-09-01&endDate=2026-08-31"
      )
    );
  });

  it("affiche les détails par type et par ville de la période", async () => {
    mockApi(routes);
    renderWithStore(<StatistiquesPage />);

    await screen.findByText("Statistiques détaillées");
    const tabs = await screen.findAllByRole("tab", {
      name: "Détails par type",
    });
    await userEvent.click(tabs[0]);
    expect(await screen.findByText("Immeubles")).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole("tab", { name: "Détails par ville" })[0]
    );
    expect((await screen.findAllByText("Cesson")).length).toBeGreaterThan(0);
  });

  it("indique le chargement des périodes et redirige sans utilisateur connecté", async () => {
    mockApi({ ...routes, "GET /api/territoires/statistiques/periodes": [] });
    const { unmount } = renderWithStore(<StatistiquesPage />, "ADMIN", {
      territories: { statisticsLoading: true },
    });
    expect(
      screen.getByText("Chargement des statistiques...")
    ).toBeInTheDocument();
    unmount();

    renderWithStore(<StatistiquesPage />, null);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
});

describe("Indicateurs (StatisticsOverview)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("calcule le taux de couverture d'une période passée", async () => {
    mockApi(routes);
    renderWithStore(
      <StatisticsOverview
        startDate="2025-09-01"
        endDate="2026-08-31"
        isCurrentPeriod={false}
      />
    );

    expect(await screen.findByText("60.0%")).toBeInTheDocument();
    expect(
      screen.getByText("Territoires parcourus (période)")
    ).toBeInTheDocument();
  });

  it("résiste aux erreurs réseau et à des réponses inattendues", async () => {
    const api = mockApi({
      ...routes,
      "GET /api/settings/publishers-count": "pas un nombre",
    });
    api.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/territoires/statistiques/non-assignes-depuis"))
        throw new Error("réseau");
      if (url === "/api/settings/publishers-count")
        return jsonResponse("pas un nombre");
      return jsonResponse({ type: "FeatureCollection", features: [] });
    });
    renderWithStore(<StatisticsOverview />);

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Erreur lors de la récupération des territoires non assignés :",
        expect.any(Error)
      )
    );
    expect(
      screen.getByText("Non parcourus depuis le 01/09")
    ).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("journalise l'échec du nombre de proclamateurs", async () => {
    const api = mockApi(routes);
    api.mockImplementation(async (url: string) => {
      if (url === "/api/settings/publishers-count") throw new Error("réseau");
      if (url === "/api/territoires/geojson")
        return jsonResponse({ type: "FeatureCollection", features: [] });
      return jsonResponse(2);
    });
    renderWithStore(<StatisticsOverview />);

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Erreur lors de la récupération du nombre de proclamateurs",
        expect.any(Error)
      )
    );
  });
});

describe("Carte de couverture", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("colore les territoires parcourus et non parcourus et centre la carte", async () => {
    mockApi(routes);
    renderWithStore(
      <TerritoryCoverageMap startDate="2026-09-01" endDate="2027-08-31" />
    );

    await waitFor(() => {
      const styles = JSON.parse(
        screen.getAllByTestId("leaflet").at(-1)!.getAttribute("data-styles")!
      );
      expect(styles.map((s: { fillColor: string }) => s.fillColor)).toEqual([
        "#22c55e",
        "#ef4444",
        "#ef4444",
      ]);
    });
    const [lat] = JSON.parse(
      screen.getAllByTestId("leaflet")[0].getAttribute("data-center")!
    );
    expect(lat).toBeCloseTo(48.15);

    await userEvent.click(screen.getByTitle("Agrandir la carte"));
    await userEvent.click(screen.getByTitle("Réduire la carte"));
  });

  it("affiche le chargement et le centre par défaut", () => {
    mockApi({});
    renderWithStore(<TerritoryCoverageMap />, "ADMIN", {
      territories: { loadingCoverageMap: true },
    });

    expect(screen.getByText("Chargement de la carte...")).toBeInTheDocument();
    expect(
      JSON.parse(
        screen.getAllByTestId("leaflet")[0].getAttribute("data-center")!
      )
    ).toEqual([48.695874, 2.367055]);
  });

  it("centre par défaut si aucun territoire n'a de géométrie", async () => {
    mockApi({
      "GET /api/territoires/statistiques/carte-couverture": {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: { parcouru: true },
          },
        ],
      },
    });
    const { store } = renderWithStore(<TerritoryCoverageMap />);

    await waitFor(() =>
      expect(
        store.getState().territories.territoryCoverageGeojson
      ).not.toBeNull()
    );
    expect(
      JSON.parse(
        screen.getAllByTestId("leaflet")[0].getAttribute("data-center")!
      )
    ).toEqual([48.695874, 2.367055]);
  });
});
