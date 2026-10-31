import { describe, it, expect, vi, beforeEach } from "vitest";
import territoryReducer, {
  fetchTerritories,
  fetchTerritoryById,
  deleteTerritory,
  returnTerritory,
  cancelAssignment,
  assignTerritory,
  extendTerritory,
} from "@/store/slices/territory-slice";
import { Territory, TerritoryCollection } from "@/models/territory";
import { City } from "@/models/city";
import * as authFetchModule from "@/utils/auth-fetch";

describe("territory slice", () => {
  const dummyFeature = {
    type: "Feature" as const,
    geometry: { type: "Point", coordinates: [2.3522, 48.8566] },
    properties: {
      id: "t-1",
      name: "Territoire 1",
      city: "Paris",
      color: "#3498db",
      status: "AVAILABLE" as const,
      type: "NORMAL" as const,
    },
  };

  const dummyCollection: TerritoryCollection = {
    type: "FeatureCollection",
    features: [
      dummyFeature as unknown as TerritoryCollection["features"][number],
    ],
  };

  const dummyCity: City = {
    id: "c-1",
    name: "Paris",
    zipCode: "75000",
    center: { latitude: 48.8566, longitude: 2.3522 },
  };

  const dummyTerritory: Territory = {
    id: "t-1",
    name: "Territoire 1",
    city: dummyCity,
    status: "AVAILABLE",
    addressesNotToDo: [],
    assignments: [],
    geojson: "{}",
    lastModifiedDate: null,
    lastVisitedOn: "",
    assignedOn: "",
    waitedFor: "",
    assignedTo: "",
  };

  const initialState = {
    territoriesGeojson: null,
    selectedTerritory: null,
    loading: false,
    updating: false,
    error: null,
    updatingReturnTerritory: false,
    updatingExtendTerritory: false,
    updatingCancelAssignment: false,
    updatingAssignment: false,
    statusHistory: [],
    territoryCoverageMap: null,
    averageAssignmentDuration: [],
    territoryDistribution: [],
    periodStatistics: null,
    latestAssignments: [],
    periodAssignments: [],
    schoolYearPeriods: [],
    statisticsLoading: false,
  } as unknown as ReturnType<typeof territoryReducer>;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial state", () => {
    const state = territoryReducer(undefined, { type: "unknown" });
    expect(state.territoriesGeojson).toBeNull();
    expect(state.selectedTerritory).toBeNull();
  });

  describe("reducers with async actions", () => {
    it("should handle fetchTerritories lifecycle", () => {
      const pending = territoryReducer(initialState, {
        type: fetchTerritories.pending.type,
      });
      expect(pending.loading).toBe(true);

      const fulfilled = territoryReducer(pending, {
        type: fetchTerritories.fulfilled.type,
        payload: dummyCollection,
      });
      expect(fulfilled.loading).toBe(false);
      expect(fulfilled.territoriesGeojson).toEqual(dummyCollection);

      const rejected = territoryReducer(pending, {
        type: fetchTerritories.rejected.type,
        payload: "Erreur territoires",
      });
      expect(rejected.loading).toBe(false);
      expect(rejected.error).toBe("Erreur territoires");
    });

    // `loading` masque les tableaux : ils perdraient leur page courante à chaque action
    it.each([
      ["assignTerritory", assignTerritory],
      ["returnTerritory", returnTerritory],
      ["cancelAssignment", cancelAssignment],
      ["extendTerritory", extendTerritory],
    ])("%s passe par `updating` sans toucher à `loading`", (_, thunk) => {
      const pending = territoryReducer(initialState, {
        type: thunk.pending.type,
      });
      expect(pending.updating).toBe(true);
      expect(pending.loading).toBe(false);

      const rejected = territoryReducer(pending, {
        type: thunk.rejected.type,
        payload: "Erreur",
      });
      expect(rejected.updating).toBe(false);
      expect(rejected.loading).toBe(false);
    });

    it("should handle fetchTerritoryById fulfilled", () => {
      const fulfilled = territoryReducer(initialState, {
        type: fetchTerritoryById.fulfilled.type,
        payload: dummyTerritory,
      });
      expect(fulfilled.selectedTerritory).toEqual(dummyTerritory);
    });

    it("should handle deleteTerritory fulfilled", () => {
      const stateWithTerritories = {
        ...initialState,
        territoriesGeojson: dummyCollection,
        selectedTerritory: dummyTerritory,
      } as unknown as typeof initialState;

      const fulfilled = territoryReducer(stateWithTerritories, {
        type: deleteTerritory.fulfilled.type,
        payload: "t-1",
      });

      expect(fulfilled.territoriesGeojson?.features).toHaveLength(0);
      expect(fulfilled.selectedTerritory).toBeNull();
    });

    it("should handle returnTerritory fulfilled", () => {
      const stateWithTerritories = {
        ...initialState,
        territoriesGeojson: {
          type: "FeatureCollection",
          features: [
            {
              ...dummyFeature,
              properties: { ...dummyFeature.properties, status: "ASSIGNED" },
            },
          ],
        },
        selectedTerritory: { ...dummyTerritory, status: "ASSIGNED" },
      } as unknown as typeof initialState;

      const fulfilled = territoryReducer(stateWithTerritories, {
        type: returnTerritory.fulfilled.type,
        payload: {
          territory: { territoryId: "t-1" },
          returnDate: "2024-02-01",
        },
      });

      expect(fulfilled.selectedTerritory?.status).toBe("PENDING");
      expect(fulfilled.territoriesGeojson?.features[0].properties.status).toBe(
        "PENDING"
      );
    });

    it("should handle cancelAssignment fulfilled", () => {
      const stateWithTerritories = {
        ...initialState,
        territoriesGeojson: {
          type: "FeatureCollection",
          features: [
            {
              ...dummyFeature,
              properties: { ...dummyFeature.properties, status: "ASSIGNED" },
            },
          ],
        },
        selectedTerritory: { ...dummyTerritory, status: "ASSIGNED" },
      } as unknown as typeof initialState;

      const fulfilled = territoryReducer(stateWithTerritories, {
        type: cancelAssignment.fulfilled.type,
        payload: {
          territory: { territoryId: "t-1" },
          returnDate: "2024-02-01",
        },
      });

      expect(fulfilled.selectedTerritory?.status).toBe("AVAILABLE");
      expect(fulfilled.territoriesGeojson?.features[0].properties.status).toBe(
        "AVAILABLE"
      );
    });
  });

  describe("thunks execution", () => {
    it("fetchTerritories should fetch data from API", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => dummyCollection,
      } as Response);

      const dispatch = vi.fn();
      const thunk = fetchTerritories();
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        "/api/territoires/geojson"
      );
      expect(result.payload).toEqual(dummyCollection);
    });
  });
});
