import { describe, it, expect, vi, beforeEach } from "vitest";
import cityReducer, {
  fetchCities,
  addCity,
  removeCity,
  updateCityColor,
} from "@/store/slices/city-slice";
import { City } from "@/models/city";
import * as authFetchModule from "@/utils/auth-fetch";

describe("city slice", () => {
  const dummyCity: City = {
    id: "city-1",
    name: "Paris",
    zipCode: "75000",
    colorHex: "#3498db",
    center: {
      latitude: 48.8566,
      longitude: 2.3522,
    },
  };

  const initialState = {
    cities: [],
    loading: false,
    error: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial state", () => {
    expect(cityReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  describe("reducers with actions", () => {
    it("should handle fetchCities.pending", () => {
      const state = cityReducer(initialState, {
        type: fetchCities.pending.type,
      });
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it("should handle fetchCities.fulfilled", () => {
      const state = cityReducer(
        { ...initialState, loading: true },
        { type: fetchCities.fulfilled.type, payload: [dummyCity] }
      );
      expect(state.loading).toBe(false);
      expect(state.cities).toEqual([dummyCity]);
    });

    it("should handle fetchCities.rejected", () => {
      const state = cityReducer(
        { ...initialState, loading: true },
        {
          type: fetchCities.rejected.type,
          error: { message: "Network error" },
        }
      );
      expect(state.loading).toBe(false);
      expect(state.error).toBe("Network error");
    });

    it("should handle addCity.fulfilled", () => {
      const state = cityReducer(initialState, {
        type: addCity.fulfilled.type,
        payload: dummyCity,
      });
      expect(state.cities).toContainEqual(dummyCity);
    });

    it("should handle removeCity.fulfilled", () => {
      const state = cityReducer(
        { ...initialState, cities: [dummyCity] },
        { type: removeCity.fulfilled.type, payload: "city-1" }
      );
      expect(state.cities).toHaveLength(0);
    });

    it("should handle updateCityColor.fulfilled", () => {
      const updatedCity: City = { ...dummyCity, colorHex: "#e74c3c" };
      const state = cityReducer(
        { ...initialState, cities: [dummyCity] },
        { type: updateCityColor.fulfilled.type, payload: updatedCity }
      );
      expect(state.cities[0].colorHex).toBe("#e74c3c");
    });
  });

  describe("thunks", () => {
    it("fetchCities should call authFetch and return data", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [dummyCity],
      } as Response);

      const dispatch = vi.fn();
      const thunk = fetchCities();
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(authFetchModule.authFetch).toHaveBeenCalledWith("/api/villes");
      expect(result.payload).toEqual([dummyCity]);
    });

    it("fetchCities should throw on failed response", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: false,
      } as Response);

      const dispatch = vi.fn();
      const thunk = fetchCities();
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(result.type).toBe("cities/fetchCities/rejected");
    });

    it("addCity should post new city", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => dummyCity,
      } as Response);

      const dispatch = vi.fn();
      const thunk = addCity({
        name: "Paris",
        zipCode: "75000",
        colorHex: "#3498db",
      });
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        "/api/villes",
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(result.payload).toEqual(dummyCity);
    });

    it("removeCity should delete city", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
      } as Response);

      const dispatch = vi.fn();
      const thunk = removeCity("city-1");
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        "/api/villes/city-1",
        { method: "DELETE" }
      );
      expect(result.payload).toBe("city-1");
    });

    it("updateCityColor should patch color", async () => {
      const updatedCity: City = { ...dummyCity, colorHex: "#e74c3c" };
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => updatedCity,
      } as Response);

      const dispatch = vi.fn();
      const thunk = updateCityColor({ id: "city-1", colorHex: "#e74c3c" });
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        "/api/villes/city-1/couleur",
        expect.objectContaining({
          method: "PATCH",
        })
      );
      expect(result.payload).toEqual(updatedCity);
    });
  });
});
