import { describe, it, expect, vi, beforeEach } from "vitest";
import statisticsReducer, {
  clearStatistics,
  fetchTerritoryStatistics,
  fetchTerritoryDistribution,
  fetchUnassignedStatistics,
  fetchAssignmentDurationStatistics,
  fetchRecentAssignments,
} from "@/store/slices/statistics-slice";
import * as authFetchModule from "@/utils/auth-fetch";

describe("statistics slice", () => {
  const initialState = {
    territoryStats: null,
    territoryDistribution: [],
    unassignedStats: null,
    assignmentDurationByMonth: [],
    overallAverageDuration: null,
    recentAssignments: [],
    loading: false,
    error: null,
    lastFetched: {
      territoryStats: null,
      territoryDistribution: null,
      unassignedStats: null,
      assignmentDuration: null,
      recentAssignments: null,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial state", () => {
    expect(statisticsReducer(undefined, { type: "unknown" })).toEqual(
      initialState
    );
  });

  it("should handle clearStatistics", () => {
    const populatedState = {
      ...initialState,
      territoryStats: {
        totalTerritories: 10,
        assignedTerritories: 5,
        availableTerritories: 4,
        pendingTerritories: 1,
      },
      territoryDistribution: [{ cityName: "Paris", count: 10 }],
    };

    const cleared = statisticsReducer(populatedState, clearStatistics());
    expect(cleared.territoryStats).toBeNull();
    expect(cleared.territoryDistribution).toEqual([]);
  });

  describe("reducers with async actions", () => {
    it("should handle fetchTerritoryStatistics fulfilled", () => {
      const payload = {
        totalTerritories: 20,
        assignedTerritories: 10,
        availableTerritories: 8,
        pendingTerritories: 2,
      };
      const state = statisticsReducer(initialState, {
        type: fetchTerritoryStatistics.fulfilled.type,
        payload,
      });

      expect(state.territoryStats).toEqual(payload);
      expect(state.loading).toBe(false);
      expect(state.lastFetched.territoryStats).not.toBeNull();
    });

    it("should handle fetchTerritoryDistribution fulfilled", () => {
      const payload = [{ cityName: "Rennes", count: 15 }];
      const state = statisticsReducer(initialState, {
        type: fetchTerritoryDistribution.fulfilled.type,
        payload,
      });

      expect(state.territoryDistribution).toEqual(payload);
      expect(state.lastFetched.territoryDistribution).not.toBeNull();
    });

    it("should handle fetchUnassignedStatistics fulfilled", () => {
      const payload = {
        lessThan3Months: 2,
        between3And6Months: 4,
        between6And12Months: 1,
        moreThan12Months: 0,
      };
      const state = statisticsReducer(initialState, {
        type: fetchUnassignedStatistics.fulfilled.type,
        payload,
      });

      expect(state.unassignedStats).toEqual(payload);
    });

    it("should handle fetchAssignmentDurationStatistics fulfilled", () => {
      const payload = {
        byMonth: [{ month: "2024-01", averageDuration: 25.5 }],
        overall: 30.2,
      };
      const state = statisticsReducer(initialState, {
        type: fetchAssignmentDurationStatistics.fulfilled.type,
        payload,
      });

      expect(state.assignmentDurationByMonth).toEqual(payload.byMonth);
      expect(state.overallAverageDuration).toBe(30.2);
    });

    it("should handle fetchRecentAssignments fulfilled", () => {
      const payload = [
        {
          id: "as-1",
          assignmentDate: "2024-01-01",
          person: { id: "p-1", firstName: "Alice", lastName: "Dupont" },
          territory: { territoryId: "t-1", name: "T1", cityName: "Paris" },
        },
      ];
      const state = statisticsReducer(initialState, {
        type: fetchRecentAssignments.fulfilled.type,
        payload,
      });

      expect(state.recentAssignments).toEqual(payload);
    });
  });

  describe("thunks caching and fetch execution", () => {
    it("fetchTerritoryStatistics should fetch when not cached", async () => {
      const data = {
        totalTerritories: 5,
        assignedTerritories: 2,
        availableTerritories: 3,
        pendingTerritories: 0,
      };
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => data,
      } as Response);

      const dispatch = vi.fn();
      const getState = () => ({ statistics: initialState });
      const thunk = fetchTerritoryStatistics();
      const result = await thunk(dispatch, getState, undefined);

      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        "/api/territoires/statistiques"
      );
      expect(result.payload).toEqual(data);
    });
  });
});
