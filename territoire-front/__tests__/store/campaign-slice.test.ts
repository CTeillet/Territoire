import { describe, it, expect, vi, beforeEach } from "vitest";
import campaignReducer, {
  clearCampaignMap,
  fetchCampaigns,
  fetchCampaign,
  createCampaign,
  deleteCampaign,
  closeCampaign,
  fetchCampaignStatistics,
  fetchCampaignMap,
} from "@/store/slices/campaign-slice";
import { Campaign } from "@/models/campaign";
import * as authFetchModule from "@/utils/auth-fetch";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

describe("campaign slice", () => {
  const dummyCampaign: Campaign = {
    id: "camp-1",
    name: "Campagne 2024",
    description: "Description test",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    closed: false,
    territories: [],
    remainingTerritories: [],
  };

  const initialState = {
    campaigns: [],
    currentCampaign: null,
    campaignStatistics: null,
    loading: false,
    deleting: false,
    creating: false,
    updating: false,
    closing: false,
    loadingStatistics: false,
    loadingMap: false,
    currentCampaignGeoJson: null,
    error: null,
    isFetchingCampaigns: false,
    isFetchingCampaign: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial state", () => {
    expect(campaignReducer(undefined, { type: "unknown" })).toEqual(
      initialState
    );
  });

  it("should handle clearCampaignMap", () => {
    const state = campaignReducer(
      {
        ...initialState,
        currentCampaignGeoJson: { type: "FeatureCollection" },
      },
      clearCampaignMap()
    );
    expect(state.currentCampaignGeoJson).toBeNull();
  });

  describe("reducers with async actions", () => {
    it("should handle fetchCampaigns lifecycle", () => {
      const pending = campaignReducer(initialState, {
        type: fetchCampaigns.pending.type,
      });
      expect(pending.loading).toBe(true);

      const fulfilled = campaignReducer(pending, {
        type: fetchCampaigns.fulfilled.type,
        payload: [dummyCampaign],
      });
      expect(fulfilled.loading).toBe(false);
      expect(fulfilled.campaigns).toEqual([dummyCampaign]);

      const rejected = campaignReducer(pending, {
        type: fetchCampaigns.rejected.type,
        payload: "Erreur campagnes",
        meta: {},
      });
      expect(rejected.loading).toBe(false);
      expect(rejected.error).toBe("Erreur campagnes");
    });

    it("should handle fetchCampaign lifecycle", () => {
      const fulfilled = campaignReducer(initialState, {
        type: fetchCampaign.fulfilled.type,
        payload: dummyCampaign,
      });
      expect(fulfilled.currentCampaign).toEqual(dummyCampaign);
    });

    it("should handle createCampaign fulfilled", () => {
      const fulfilled = campaignReducer(initialState, {
        type: createCampaign.fulfilled.type,
        payload: dummyCampaign,
      });
      expect(fulfilled.campaigns).toContainEqual(dummyCampaign);
      expect(fulfilled.creating).toBe(false);
    });

    it("should handle deleteCampaign fulfilled", () => {
      const stateWithCampaign = {
        ...initialState,
        campaigns: [dummyCampaign],
        currentCampaign: dummyCampaign,
      };

      const fulfilled = campaignReducer(stateWithCampaign, {
        type: deleteCampaign.fulfilled.type,
        payload: "camp-1",
      });
      expect(fulfilled.campaigns).toHaveLength(0);
      expect(fulfilled.currentCampaign).toBeNull();
    });

    it("should handle closeCampaign fulfilled", () => {
      const stateWithCampaign = {
        ...initialState,
        campaigns: [dummyCampaign],
        currentCampaign: dummyCampaign,
      };
      const closedCampaign = { ...dummyCampaign, closed: true };

      const fulfilled = campaignReducer(stateWithCampaign, {
        type: closeCampaign.fulfilled.type,
        payload: closedCampaign,
      });
      expect(fulfilled.campaigns[0].closed).toBe(true);
      expect(fulfilled.currentCampaign?.closed).toBe(true);
    });

    it("should handle fetchCampaignStatistics fulfilled", () => {
      const dummyStats = {
        totalAssignments: 15,
        totalCompleted: 10,
        completionRate: 66.6,
      } as any;

      const fulfilled = campaignReducer(initialState, {
        type: fetchCampaignStatistics.fulfilled.type,
        payload: dummyStats,
      });
      expect(fulfilled.campaignStatistics).toEqual(dummyStats);
    });

    it("should handle fetchCampaignMap fulfilled", () => {
      const geojson = { type: "FeatureCollection", features: [] };
      const fulfilled = campaignReducer(initialState, {
        type: fetchCampaignMap.fulfilled.type,
        payload: geojson,
      });
      expect(fulfilled.currentCampaignGeoJson).toEqual(geojson);
    });
  });

  describe("thunks execution", () => {
    it("fetchCampaigns should call API and return data", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [dummyCampaign],
      } as Response);

      const dispatch = vi.fn();
      const getState = () => ({ campaigns: initialState });
      const thunk = fetchCampaigns();
      const result = await thunk(dispatch, getState, undefined);

      expect(authFetchModule.authFetch).toHaveBeenCalledWith("/api/campagnes");
      expect(result.payload).toEqual([dummyCampaign]);
    });
  });
});
