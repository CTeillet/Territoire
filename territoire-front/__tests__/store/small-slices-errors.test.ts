import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import personReducer, {
  createPerson,
  deletePerson,
  fetchAssignedTerritories,
  fetchPersons,
  updatePerson,
} from "@/store/slices/person-slice";
import reminderReducer, {
  createReminder,
  fetchReminders,
} from "@/store/slices/reminder-slice";
import userReducer, {
  createUserThunk,
  deleteUserThunk,
  fetchUsersThunk,
  updateUserRoleThunk,
} from "@/store/slices/user-slice";
import cityReducer, {
  addCity,
  removeCity,
  updateCityColor,
} from "@/store/slices/city-slice";
import * as authFetchModule from "@/utils/auth-fetch";

const store = () =>
  configureStore({
    reducer: {
      persons: personReducer,
      reminders: reminderReducer,
      users: userReducer,
      cities: cityReducer,
    },
  });

const failing = (
  headers: Record<string, string> = {},
  body: unknown = null,
  text = ""
): Response =>
  ({
    ok: false,
    status: 400,
    headers: new Headers(headers),
    json: async () => body,
    text: async () => text,
  }) as unknown as Response;
const unreadable = (thrown: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => {
      throw thrown;
    },
  }) as unknown as Response;
const ok = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

const person = { id: "p1", firstName: "Jean", lastName: "Dupont" };

describe("cas d'erreur des petits slices", () => {
  let authFetch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    authFetch = vi.spyOn(authFetchModule, "authFetch");
  });

  describe("person-slice", () => {
    it.each([
      [
        "fetchPersons",
        () => fetchPersons(),
        "Erreur lors de la récupération des personnes",
      ],
      [
        "createPerson",
        () => createPerson({ firstName: "Jean", lastName: "Dupont" }),
        "Échec de la création",
      ],
      ["updatePerson", () => updatePerson(person), "Échec de la mise à jour"],
      [
        "fetchAssignedTerritories",
        () => fetchAssignedTerritories("p1"),
        "Erreur lors de la récupération des territoires assignés",
      ],
    ])(
      "%s : erreur HTTP, réponse illisible et erreur inconnue",
      async (_name, thunk, message) => {
        const s = store();

        authFetch.mockResolvedValueOnce(failing());
        expect(
          ((await s.dispatch(thunk() as never)) as { payload: unknown }).payload
        ).toBe(message);

        authFetch.mockResolvedValueOnce(unreadable(new Error("JSON invalide")));
        expect(
          ((await s.dispatch(thunk() as never)) as { payload: unknown }).payload
        ).toBe("JSON invalide");

        authFetch.mockResolvedValueOnce(unreadable("bizarre"));
        expect(
          ((await s.dispatch(thunk() as never)) as { payload: unknown }).payload
        ).toBe("Une erreur inconnue s'est produite");
      }
    );

    it("deletePerson : erreur HTTP", async () => {
      authFetch.mockResolvedValueOnce(failing());
      expect((await store().dispatch(deletePerson("p1"))).payload).toBe(
        "Échec de la suppression"
      );
    });

    it("fetchPersons : ignore une demande pendant un chargement", async () => {
      const s = configureStore({
        reducer: { persons: personReducer },
        preloadedState: {
          persons: {
            ...personReducer(undefined, { type: "init" }),
            isFetchingPersons: true,
          },
        },
      });

      await s.dispatch(fetchPersons());

      expect(authFetch).not.toHaveBeenCalled();
    });

    it("fetchAssignedTerritories : charge les attributions de la personne", async () => {
      authFetch.mockResolvedValueOnce(ok([{ id: "as1" }]));
      const result = await store().dispatch(fetchAssignedTerritories("p1"));
      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/personnes/p1/territoires"
      );
      expect(result.payload).toEqual([{ id: "as1" }]);
    });
  });

  describe("reminder-slice", () => {
    it("fetchReminders : erreur HTTP, réseau et inconnue", async () => {
      const s = store();
      authFetch.mockResolvedValueOnce(failing());
      expect((await s.dispatch(fetchReminders())).payload).toBe(
        "Erreur lors de la récupération des rappels"
      );

      authFetch.mockRejectedValueOnce(new Error("réseau coupé"));
      expect((await s.dispatch(fetchReminders())).payload).toBe("réseau coupé");

      authFetch.mockRejectedValueOnce("bizarre");
      expect((await s.dispatch(fetchReminders())).payload).toBe(
        "Une erreur inconnue s'est produite"
      );
    });

    it("createReminder : transmet les notes encodées", async () => {
      authFetch.mockResolvedValueOnce(ok({ id: "r1" }));

      await store().dispatch(
        createReminder({
          territoryId: "t1",
          personId: "p1",
          notes: "à rappeler & relancer",
        })
      );

      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territory-reminders?territoryIds=t1&personId=p1&notes=%C3%A0%20rappeler%20%26%20relancer",
        { method: "POST" }
      );
    });

    it.each([
      [
        "message JSON (message)",
        failing(
          { "content-type": "application/json" },
          { message: "Déjà rappelé" }
        ),
        "Déjà rappelé",
      ],
      [
        "message JSON (error)",
        failing(
          { "content-type": "application/json" },
          { error: "Personne inconnue" }
        ),
        "Personne inconnue",
      ],
      [
        "JSON sans message",
        failing({ "content-type": "application/json" }, {}),
        "Failed to send reminder",
      ],
      [
        "texte brut",
        failing({ "content-type": "text/plain" }, null, "Erreur texte"),
        "Erreur texte",
      ],
      [
        "texte vide",
        failing({ "content-type": "text/plain" }, null, ""),
        "Failed to send reminder",
      ],
    ])(
      "createReminder : remonte le %s du serveur",
      async (_name, response, message) => {
        authFetch.mockResolvedValueOnce(response);

        const result = await store().dispatch(
          createReminder({ territoryId: "t1", personId: "p1" })
        );

        expect(result.payload).toBe(message);
      }
    );

    it("createReminder : corps d'erreur illisible et erreur inconnue", async () => {
      authFetch.mockResolvedValueOnce({
        ok: false,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => {
          throw new Error("illisible");
        },
      } as unknown as Response);
      expect(
        (
          await store().dispatch(
            createReminder({ territoryId: "t1", personId: "p1" })
          )
        ).payload
      ).toBe("Failed to send reminder");

      authFetch.mockRejectedValueOnce("bizarre");
      expect(
        (
          await store().dispatch(
            createReminder({ territoryId: "t1", personId: "p1" })
          )
        ).payload
      ).toBe("Impossible d'envoyer le rappel");
    });
  });

  describe("user-slice", () => {
    it.each([
      [
        "fetchUsersThunk",
        () => fetchUsersThunk(),
        "Erreur lors du chargement des utilisateurs",
      ],
      [
        "createUserThunk",
        () =>
          createUserThunk({
            username: "a",
            email: "a@b.fr",
            password: "x",
            role: "ADMIN",
          }),
        "Erreur lors de la création de l'utilisateur",
      ],
      [
        "updateUserRoleThunk",
        () => updateUserRoleThunk({ id: "u1", role: "ADMIN" }),
        "Erreur lors de la mise à jour du rôle",
      ],
      [
        "deleteUserThunk",
        () => deleteUserThunk("u1"),
        "Erreur lors de la suppression de l'utilisateur",
      ],
    ])("%s : erreur HTTP", async (_name, thunk, message) => {
      const s = store();
      authFetch.mockResolvedValueOnce(failing());

      const result = (await s.dispatch(thunk() as never)) as {
        payload: unknown;
      };

      expect(result.payload).toBe(message);
      expect(s.getState().users.error).toBe(message);
    });
  });

  describe("city-slice", () => {
    it.each([
      [
        "addCity",
        () => addCity({ name: "Rennes", zipCode: "35000" } as never),
        "Erreur lors de l'ajout de la ville",
      ],
      [
        "removeCity",
        () => removeCity("c1"),
        "Erreur lors de la suppression de la ville",
      ],
      [
        "updateCityColor",
        () => updateCityColor({ id: "c1", colorHex: "#000000" }),
        "Erreur lors de la mise à jour de la couleur",
      ],
    ])("%s : erreur HTTP", async (_name, thunk, message) => {
      authFetch.mockResolvedValueOnce(failing());

      const result = (await store().dispatch(thunk() as never)) as {
        error: { message: string };
      };

      expect(result.error.message).toBe(message);
    });
  });
});
