import { describe, it, expect, vi, beforeEach } from "vitest";
import personReducer, {
  fetchPersons,
  createPerson,
  deletePerson,
  updatePerson,
  fetchAssignedTerritories,
} from "@/store/slices/person-slice";
import { Person } from "@/models/person";
import { Assignment } from "@/models/assignment";
import * as authFetchModule from "@/utils/auth-fetch";

describe("person slice", () => {
  const dummyPerson: Person = {
    id: "p-1",
    firstName: "Jean",
    lastName: "Dupont",
    phoneNumber: "0612345678",
    email: "jean@example.com",
  };

  const initialState = {
    persons: [],
    loading: false,
    deleting: false,
    creating: false,
    updating: false,
    error: null,
    isFetchingPersons: false,
    assignedTerritories: [],
    loadingAssignedTerritories: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial state", () => {
    expect(personReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  describe("reducers", () => {
    it("should handle fetchPersons lifecycle", () => {
      const pending = personReducer(initialState, {
        type: fetchPersons.pending.type,
      });
      expect(pending.loading).toBe(true);
      expect(pending.isFetchingPersons).toBe(true);

      const fulfilled = personReducer(pending, {
        type: fetchPersons.fulfilled.type,
        payload: [dummyPerson],
      });
      expect(fulfilled.loading).toBe(false);
      expect(fulfilled.isFetchingPersons).toBe(false);
      expect(fulfilled.persons).toEqual([dummyPerson]);

      const rejected = personReducer(pending, {
        type: fetchPersons.rejected.type,
        payload: "Erreur récupération",
      });
      expect(rejected.loading).toBe(false);
      expect(rejected.error).toBe("Erreur récupération");
    });

    it("should handle createPerson lifecycle", () => {
      const pending = personReducer(initialState, {
        type: createPerson.pending.type,
      });
      expect(pending.creating).toBe(true);

      const fulfilled = personReducer(pending, {
        type: createPerson.fulfilled.type,
        payload: dummyPerson,
      });
      expect(fulfilled.creating).toBe(false);
      expect(fulfilled.persons).toContainEqual(dummyPerson);

      const rejected = personReducer(pending, {
        type: createPerson.rejected.type,
        payload: "Erreur création",
      });
      expect(rejected.creating).toBe(false);
      expect(rejected.error).toBe("Erreur création");
    });

    it("should handle deletePerson lifecycle", () => {
      const stateWithPerson = { ...initialState, persons: [dummyPerson] };
      const pending = personReducer(stateWithPerson, {
        type: deletePerson.pending.type,
      });
      expect(pending.deleting).toBe(true);

      const fulfilled = personReducer(pending, {
        type: deletePerson.fulfilled.type,
        payload: "p-1",
      });
      expect(fulfilled.deleting).toBe(false);
      expect(fulfilled.persons).toHaveLength(0);

      const rejected = personReducer(pending, {
        type: deletePerson.rejected.type,
        payload: "Erreur suppression",
      });
      expect(rejected.deleting).toBe(false);
      expect(rejected.error).toBe("Erreur suppression");
    });

    it("should handle updatePerson lifecycle", () => {
      const stateWithPerson = { ...initialState, persons: [dummyPerson] };
      const pending = personReducer(stateWithPerson, {
        type: updatePerson.pending.type,
      });
      expect(pending.updating).toBe(true);

      const updated = { ...dummyPerson, firstName: "Paul" };
      const fulfilled = personReducer(pending, {
        type: updatePerson.fulfilled.type,
        payload: updated,
      });
      expect(fulfilled.updating).toBe(false);
      expect(fulfilled.persons[0].firstName).toBe("Paul");

      const rejected = personReducer(pending, {
        type: updatePerson.rejected.type,
        payload: "Erreur mise à jour",
      });
      expect(rejected.updating).toBe(false);
      expect(rejected.error).toBe("Erreur mise à jour");
    });

    it("should handle fetchAssignedTerritories lifecycle", () => {
      const dummyAssignment: Assignment = {
        id: "a-1",
        assignmentDate: "2024-01-01",
        dueDate: "2024-05-01",
        returnDate: null,
        territory: {
          territoryId: "t-1",
          name: "T1",
          cityName: "Paris",
          cityId: "c-1",
          status: "AVAILABLE",
        },
      };

      const pending = personReducer(initialState, {
        type: fetchAssignedTerritories.pending.type,
      });
      expect(pending.loadingAssignedTerritories).toBe(true);

      const fulfilled = personReducer(pending, {
        type: fetchAssignedTerritories.fulfilled.type,
        payload: [dummyAssignment],
      });
      expect(fulfilled.loadingAssignedTerritories).toBe(false);
      expect(fulfilled.assignedTerritories).toEqual([dummyAssignment]);

      const rejected = personReducer(pending, {
        type: fetchAssignedTerritories.rejected.type,
        payload: "Erreur assignation",
      });
      expect(rejected.loadingAssignedTerritories).toBe(false);
      expect(rejected.error).toBe("Erreur assignation");
    });
  });

  describe("thunks execution", () => {
    it("fetchPersons should fetch and return persons", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => [dummyPerson],
      } as Response);

      const dispatch = vi.fn();
      const getState = () => ({ persons: initialState });
      const thunk = fetchPersons();
      const result = await thunk(dispatch, getState, undefined);

      expect(result.payload).toEqual([dummyPerson]);
    });

    it("createPerson should post and return new person", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
        json: async () => dummyPerson,
      } as Response);

      const dispatch = vi.fn();
      const thunk = createPerson(dummyPerson);
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(result.payload).toEqual(dummyPerson);
    });

    it("deletePerson should delete and return id", async () => {
      vi.spyOn(authFetchModule, "authFetch").mockResolvedValueOnce({
        ok: true,
      } as Response);

      const dispatch = vi.fn();
      const thunk = deletePerson("p-1");
      const result = await thunk(dispatch, () => ({}), undefined);

      expect(result.payload).toBe("p-1");
    });
  });
});
