import { describe, it, expect, vi, beforeEach } from "vitest";
import reminderReducer, {
  fetchReminders,
  createReminder,
} from "@/store/slices/reminder-slice";
import { TerritoryReminder } from "@/models/territory-reminder";
import * as authFetchModule from "@/utils/auth-fetch";

describe("reminder slice", () => {
  const dummyReminder: TerritoryReminder = {
    id: "rem-1",
    territoryId: "t-1",
    personId: "p-1",
    personName: "Jean Dupont",
    reminderDate: "2024-01-01T10:00:00Z",
    notes: "Rappel test",
  };

  const initialState = {
    reminders: [],
    loading: false,
    error: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial state", () => {
    expect(reminderReducer(undefined, { type: "unknown" })).toEqual(
      initialState
    );
  });

  describe("reducers", () => {
    it("should handle fetchReminders lifecycle", () => {
      const pending = reminderReducer(initialState, {
        type: fetchReminders.pending.type,
      });
      expect(pending.loading).toBe(true);

      const fulfilled = reminderReducer(pending, {
        type: fetchReminders.fulfilled.type,
        payload: [dummyReminder],
      });
      expect(fulfilled.loading).toBe(false);
      expect(fulfilled.reminders).toEqual([dummyReminder]);

      const rejected = reminderReducer(pending, {
        type: fetchReminders.rejected.type,
        payload: "Erreur rappels",
      });
      expect(rejected.loading).toBe(false);
      expect(rejected.error).toBe("Erreur rappels");
    });

    it("should handle createReminder lifecycle", () => {
      const pending = reminderReducer(initialState, {
        type: createReminder.pending.type,
      });
      expect(pending.loading).toBe(true);

      const fulfilled = reminderReducer(pending, {
        type: createReminder.fulfilled.type,
        payload: dummyReminder,
      });
      expect(fulfilled.loading).toBe(false);
      expect(fulfilled.reminders).toContainEqual(dummyReminder);

      const rejected = reminderReducer(pending, {
        type: createReminder.rejected.type,
        payload: "Erreur création rappel",
      });
      expect(rejected.loading).toBe(false);
      expect(rejected.error).toBe("Erreur création rappel");
    });
  });

  describe("thunks execution", () => {
    it("fetchReminders should fetch data", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [dummyReminder],
      } as Response);

      const dispatch = vi.fn();
      const thunk = fetchReminders();
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(result.payload).toEqual([dummyReminder]);
    });

    it("createReminder should post data with notes", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => dummyReminder,
      } as Response);

      const dispatch = vi.fn();
      const thunk = createReminder({
        territoryId: "t-1",
        personId: "p-1",
        notes: "Attention",
      });
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(authFetchModule.authFetch).toHaveBeenCalledWith(
        expect.stringContaining("notes=Attention"),
        expect.objectContaining({ method: "POST" })
      );
      expect(result.payload).toEqual(dummyReminder);
    });
  });
});
