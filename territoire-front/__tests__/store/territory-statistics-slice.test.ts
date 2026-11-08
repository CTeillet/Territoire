import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import territoryStatisticsReducer, {
  fetchAssignmentsInPeriod,
  fetchAverageAssignmentDurationByMonth,
  fetchLatestAssignments,
  fetchOverallAverageAssignmentDuration,
  fetchSchoolYearPeriods,
  fetchTerritoriesNotAssignedSince,
  fetchTerritoryCoverageMap,
  fetchTerritoryDistributionByCity,
  fetchTerritoryPeriodStatistics,
  fetchTerritoryStatusHistory,
} from "@/store/slices/territory-statistics-slice";
import * as authFetchModule from "@/utils/auth-fetch";

type State = ReturnType<typeof territoryStatisticsReducer>;

const newStore = () =>
  configureStore({
    reducer: { territoryStatistics: territoryStatisticsReducer },
  });

const ok = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;
const failing = (status = 500): Response =>
  ({
    ok: false,
    status,
    statusText: "Erreur serveur",
    json: async () => ({}),
    text: async () => "",
  }) as Response;

const assignment = () => ({
  id: "as1",
  territory: { territoryId: "t1", name: "R-12", status: "ASSIGNED" },
  person: { id: "p1", firstName: "Jean", lastName: "Dupont" },
  assignmentDate: "2026-10-01",
  dueDate: "2027-02-01",
  returnDate: null,
});

describe("territory-statistics-slice : thunks et reducers", () => {
  let authFetch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    authFetch = vi.spyOn(authFetchModule, "authFetch");
  });

  describe("statistiques (requêtes GET avec période facultative)", () => {
    const period = { startDate: "2025-09-01", endDate: "2026-08-31" };
    const query = "?startDate=2025-09-01&endDate=2026-08-31";

    it.each([
      [
        "fetchTerritoryStatusHistory",
        fetchTerritoryStatusHistory,
        "/api/territoires/statistiques",
        [{ date: "2026-01-01" }],
        (s: State) => s.territoryStatusHistory,
      ],
      [
        "fetchTerritoriesNotAssignedSince",
        fetchTerritoriesNotAssignedSince,
        "/api/territoires/statistiques/non-assignes-depuis",
        7,
        (s: State) => s.territoriesNotAssignedSince,
      ],
      [
        "fetchAverageAssignmentDurationByMonth",
        fetchAverageAssignmentDurationByMonth,
        "/api/territoires/statistiques/duree-moyenne-attribution/par-mois",
        [{ period: "2026-01", averageDuration: 30 }],
        (s: State) => s.averageAssignmentDurationByMonth,
      ],
      [
        "fetchOverallAverageAssignmentDuration",
        fetchOverallAverageAssignmentDuration,
        "/api/territoires/statistiques/duree-moyenne-attribution/globale",
        42.5,
        (s: State) => s.overallAverageAssignmentDuration,
      ],
      [
        "fetchTerritoryDistributionByCity",
        fetchTerritoryDistributionByCity,
        "/api/territoires/statistiques/distribution-par-ville",
        [{ cityName: "Rennes", territoryCount: 3, percentage: 100 }],
        (s: State) => s.territoryDistributionByCity,
      ],
      [
        "fetchTerritoryPeriodStatistics",
        fetchTerritoryPeriodStatistics,
        "/api/territoires/statistiques/resume-periode",
        { totalTerritories: 3 },
        (s: State) => s.periodStatistics,
      ],
      [
        "fetchTerritoryCoverageMap",
        fetchTerritoryCoverageMap,
        "/api/territoires/statistiques/carte-couverture",
        { type: "FeatureCollection", features: [] },
        (s: State) => s.territoryCoverageGeojson,
      ],
      [
        "fetchAssignmentsInPeriod",
        fetchAssignmentsInPeriod,
        "/api/attributions/periode",
        [assignment()],
        (s: State) => s.periodAssignments,
      ],
    ] as const)(
      "%s : succès, filtre de période et erreurs",
      async (_name, thunk, url, payload, select) => {
        const store = newStore();

        authFetch.mockResolvedValueOnce(ok(payload));
        await store.dispatch(thunk(period) as never);
        expect(authFetch).toHaveBeenLastCalledWith(url + query);
        expect(select(store.getState().territoryStatistics)).toEqual(payload);
        expect(store.getState().territoryStatistics.error).toBeNull();

        // Sans période : pas de paramètres
        authFetch.mockResolvedValueOnce(ok(payload));
        await store.dispatch(thunk(undefined) as never);
        expect(authFetch).toHaveBeenLastCalledWith(url);

        // Réponse en erreur : message dédié
        authFetch.mockResolvedValueOnce(failing());
        await store.dispatch(thunk(undefined) as never);
        expect(store.getState().territoryStatistics.error).toMatch(
          /Erreur lors de la récupération/
        );

        // Coupure réseau : même message, pas celui de l'exception (technique, en anglais)
        authFetch.mockRejectedValueOnce(new Error("Failed to fetch"));
        await store.dispatch(thunk(undefined) as never);
        expect(store.getState().territoryStatistics.error).toMatch(
          /Erreur lors de la récupération/
        );

        // Réponse illisible
        authFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError("Unexpected token");
          },
        } as unknown as Response);
        await store.dispatch(thunk(undefined) as never);
        expect(store.getState().territoryStatistics.error).toMatch(
          /Erreur lors de la récupération/
        );
        expect(store.getState().territoryStatistics.statisticsLoading).toBe(
          false
        );
      }
    );

    it.each([
      [
        "fetchLatestAssignments",
        fetchLatestAssignments,
        "/api/attributions/dernieres",
        [assignment()],
        (s: State) => s.latestAssignments,
      ],
      [
        "fetchSchoolYearPeriods",
        fetchSchoolYearPeriods,
        "/api/territoires/statistiques/periodes",
        [{ startYear: 2025 }],
        (s: State) => s.schoolYearPeriods,
      ],
    ] as const)(
      "%s : succès et erreurs",
      async (_name, thunk, url, payload, select) => {
        const store = newStore();

        authFetch.mockResolvedValueOnce(ok(payload));
        await store.dispatch(thunk() as never);
        expect(authFetch).toHaveBeenLastCalledWith(url);
        expect(select(store.getState().territoryStatistics)).toEqual(payload);

        authFetch.mockResolvedValueOnce(failing());
        await store.dispatch(thunk() as never);
        expect(store.getState().territoryStatistics.error).toMatch(
          /Erreur lors de la récupération/
        );
        expect(store.getState().territoryStatistics.statisticsLoading).toBe(
          false
        );

        authFetch.mockRejectedValueOnce(new Error("Failed to fetch"));
        await store.dispatch(thunk() as never);
        expect(store.getState().territoryStatistics.error).toMatch(
          /Erreur lors de la récupération/
        );
      }
    );
  });
});
