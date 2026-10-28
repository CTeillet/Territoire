import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import territoryReducer, {
  addAddressNotToVisit,
  addTerritory,
  assignTerritory,
  cancelAssignment,
  deleteAddressNotToVisit,
  deleteTerritory,
  extendTerritory,
  fetchAssignmentsInPeriod,
  fetchAverageAssignmentDurationByMonth,
  fetchLatestAssignments,
  fetchOverallAverageAssignmentDuration,
  fetchSchoolYearPeriods,
  fetchTerritories,
  fetchTerritoriesNotAssignedSince,
  fetchTerritoryById,
  fetchTerritoryCoverageMap,
  fetchTerritoryDistributionByCity,
  fetchTerritoryPeriodStatistics,
  fetchTerritoryStatusHistory,
  modifyAddressNotToVisit,
  returnTerritory,
  updateAssignmentDates,
  updateTerritory,
} from "@/store/slices/territory-slice";
import * as authFetchModule from "@/utils/auth-fetch";
import { Territory, TerritoryCollection } from "@/models/territory";

type State = ReturnType<typeof territoryReducer>;

const newStore = (preloaded?: Partial<State>) =>
  configureStore({
    reducer: { territories: territoryReducer },
    preloadedState: preloaded
      ? {
          territories: {
            ...territoryReducer(undefined, { type: "init" }),
            ...preloaded,
          },
        }
      : undefined,
  });

const ok = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;
const failing = (status = 500, text = ""): Response =>
  ({
    ok: false,
    status,
    statusText: "Erreur serveur",
    json: async () => ({}),
    text: async () => text,
  }) as Response;

const territory = (overrides: Partial<Territory> = {}): Territory => ({
  id: "t1",
  name: "R-12",
  status: "AVAILABLE",
  lastModifiedDate: "2026-01-01",
  city: {
    id: "c1",
    name: "Rennes",
    zipCode: "35000",
    center: { latitude: 48.1, longitude: -1.6 },
  },
  addressesNotToDo: [
    {
      id: "a1",
      street: "rue A",
      number: "1",
      zipCode: "35000",
      city: "Rennes",
    },
  ] as Territory["addressesNotToDo"],
  assignments: [],
  geojson: "{}",
  lastVisitedOn: "nouveau",
  assignedOn: "N/A",
  waitedFor: "N/A",
  assignedTo: "N/A",
  ...overrides,
});

const collection = (
  status: Territory["status"] = "AVAILABLE"
): TerritoryCollection => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [] },
      properties: territory({ status }),
    },
  ],
});

const assignment = (overrides: Record<string, unknown> = {}) => ({
  id: "as1",
  territory: { territoryId: "t1", name: "R-12", status: "ASSIGNED" },
  person: { id: "p1", firstName: "Jean", lastName: "Dupont" },
  assignmentDate: "2026-10-01",
  dueDate: "2027-02-01",
  returnDate: null,
  ...overrides,
});

describe("territory-slice : thunks et reducers", () => {
  let authFetch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
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
        expect(select(store.getState().territories)).toEqual(payload);
        expect(store.getState().territories.error).toBeNull();

        // Sans période : pas de paramètres
        authFetch.mockResolvedValueOnce(ok(payload));
        await store.dispatch(thunk(undefined) as never);
        expect(authFetch).toHaveBeenLastCalledWith(url);

        // Réponse en erreur : message dédié
        authFetch.mockResolvedValueOnce(failing());
        await store.dispatch(thunk(undefined) as never);
        expect(store.getState().territories.error).toMatch(
          /Erreur lors de la récupération/
        );

        // Erreur réseau : message de l'exception
        authFetch.mockRejectedValueOnce(new Error("réseau coupé"));
        await store.dispatch(thunk(undefined) as never);
        expect(store.getState().territories.error).toBe("réseau coupé");

        // Erreur inconnue
        authFetch.mockRejectedValueOnce("bizarre");
        await store.dispatch(thunk(undefined) as never);
        expect(store.getState().territories.error).toBe(
          "Une erreur inconnue s'est produite"
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
        expect(select(store.getState().territories)).toEqual(payload);

        authFetch.mockResolvedValueOnce(failing());
        await store.dispatch(thunk() as never);
        expect(store.getState().territories.error).toMatch(
          /Erreur lors de la récupération/
        );
        expect(store.getState().territories.statisticsLoading).toBe(false);

        authFetch.mockRejectedValueOnce(new Error("réseau coupé"));
        await store.dispatch(thunk() as never);
        expect(store.getState().territories.error).toBe("réseau coupé");

        authFetch.mockRejectedValueOnce(42);
        await store.dispatch(thunk() as never);
        expect(store.getState().territories.error).toBe(
          "Une erreur inconnue s'est produite"
        );
      }
    );
  });

  describe("chargement des territoires", () => {
    it("fetchTerritories : succès puis erreurs", async () => {
      const store = newStore();
      authFetch.mockResolvedValueOnce(ok(collection()));
      await store.dispatch(fetchTerritories());
      expect(
        store.getState().territories.territoriesGeojson?.features
      ).toHaveLength(1);
      expect(store.getState().territories.loading).toBe(false);

      authFetch.mockResolvedValueOnce(failing());
      await store.dispatch(fetchTerritories());
      expect(store.getState().territories.error).toBe(
        "Erreur lors de la récupération des territoires (GeoJSON)"
      );

      authFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("JSON invalide");
        },
      } as unknown as Response);
      await store.dispatch(fetchTerritories());
      expect(store.getState().territories.error).toBe("JSON invalide");
    });

    it("fetchTerritoryById : sélectionne le territoire ou signale l'erreur", async () => {
      const store = newStore();
      authFetch.mockResolvedValueOnce(ok(territory()));
      await store.dispatch(fetchTerritoryById("t1"));
      expect(authFetch).toHaveBeenLastCalledWith("/api/territoires/t1");
      expect(store.getState().territories.selectedTerritory?.name).toBe("R-12");

      authFetch.mockResolvedValueOnce(failing(404));
      await store.dispatch(fetchTerritoryById("t1"));
      expect(store.getState().territories.selectedTerritory).toBeNull();
      expect(store.getState().territories.error).toBe(
        "Erreur lors de la récupération du territoire"
      );

      authFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw "pas une Error";
        },
      } as unknown as Response);
      await store.dispatch(fetchTerritoryById("t1"));
      expect(store.getState().territories.error).toBe(
        "Une erreur inconnue s'est produite"
      );
    });

    it("addTerritory : ajoute le territoire à la carte", async () => {
      const store = newStore({ territoriesGeojson: collection() });
      authFetch.mockResolvedValueOnce(
        ok({
          id: "t2",
          name: "R-13",
          status: "AVAILABLE",
          city: territory().city,
        })
      );

      await store.dispatch(addTerritory({ name: "R-13", cityId: "c1" }));

      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "R-13", cityId: "c1" }),
        })
      );
      const names = store
        .getState()
        .territories.territoriesGeojson!.features.map((f) => f.properties.name);
      expect(names).toEqual(["R-12", "R-13"]);

      authFetch.mockResolvedValueOnce(failing());
      await store.dispatch(addTerritory({ name: "R-14", cityId: "c1" }));
      expect(store.getState().territories.error).toBe(
        "Erreur lors de l'ajout du territoire"
      );

      authFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("JSON invalide");
        },
      } as unknown as Response);
      await store.dispatch(addTerritory({ name: "R-14", cityId: "c1" }));
      expect(store.getState().territories.error).toBe("JSON invalide");
    });

    it("updateTerritory : met à jour le territoire sélectionné", async () => {
      const store = newStore({ selectedTerritory: territory() });
      authFetch.mockResolvedValueOnce(ok({ id: "t1", name: "R-12 bis" }));

      await store.dispatch(
        updateTerritory({ id: "t1", dto: { name: "R-12 bis" } as never })
      );

      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires/t1",
        expect.objectContaining({ method: "PUT" })
      );
      expect(store.getState().territories.selectedTerritory?.name).toBe(
        "R-12 bis"
      );
      expect(store.getState().territories.updating).toBe(false);

      authFetch.mockResolvedValueOnce(failing());
      await store.dispatch(updateTerritory({ id: "t1", dto: {} as never }));
      expect(store.getState().territories.error).toBe(
        "Erreur lors de la mise à jour du territoire"
      );

      authFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("JSON invalide");
        },
      } as unknown as Response);
      await store.dispatch(updateTerritory({ id: "t1", dto: {} as never }));
      expect(store.getState().territories.error).toBe("JSON invalide");
    });

    it("deleteTerritory : retire le territoire, ou signale l'erreur", async () => {
      const store = newStore({
        territoriesGeojson: collection(),
        selectedTerritory: territory(),
      });
      authFetch.mockResolvedValueOnce(failing());
      const rejected = await store.dispatch(deleteTerritory("t1"));
      expect(rejected.payload).toBe(
        "Erreur lors de la suppression du territoire"
      );

      authFetch.mockResolvedValueOnce(ok(null));
      await store.dispatch(deleteTerritory("t1"));
      expect(
        store.getState().territories.territoriesGeojson?.features
      ).toHaveLength(0);
      expect(store.getState().territories.selectedTerritory).toBeNull();
    });
  });

  describe("cycle d'attribution", () => {
    it("assignTerritory : passe le territoire en attribué partout", async () => {
      const store = newStore({
        territoriesGeojson: collection(),
        selectedTerritory: territory(),
      });
      authFetch.mockResolvedValueOnce(ok(assignment()));

      await store.dispatch(
        assignTerritory({ territoryId: "t1", personId: "p1" })
      );

      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires/t1/attribuer/p1",
        expect.objectContaining({ method: "POST" })
      );
      const { territoriesGeojson, selectedTerritory } =
        store.getState().territories;
      const props = territoriesGeojson!.features[0].properties;
      expect(props.status).toBe("ASSIGNED");
      expect(props.assignedTo).toBe("Jean Dupont");
      expect(props.waitedFor).toBe("2027-02-01");
      expect(selectedTerritory?.status).toBe("ASSIGNED");
      expect(selectedTerritory?.assignments).toHaveLength(1);
    });

    it("assignTerritory : ignore une réponse incomplète ou un territoire absent du store", async () => {
      const store = newStore({ territoriesGeojson: collection() });
      authFetch.mockResolvedValueOnce(
        ok(assignment({ territory: { territoryId: "inconnu" } }))
      );
      await store.dispatch(
        assignTerritory({ territoryId: "inconnu", personId: "p1" })
      );
      expect(
        store.getState().territories.territoriesGeojson!.features[0].properties
          .status
      ).toBe("AVAILABLE");

      authFetch.mockResolvedValueOnce(ok(assignment({ territory: {} })));
      await store.dispatch(
        assignTerritory({ territoryId: "t1", personId: "p1" })
      );
      expect(store.getState().territories.loading).toBe(false);
    });

    it("assignTerritory : signale les erreurs", async () => {
      const store = newStore();
      authFetch.mockResolvedValueOnce(failing(409));
      await store.dispatch(
        assignTerritory({ territoryId: "t1", personId: "p1" })
      );
      expect(store.getState().territories.error).toBe(
        "Erreur lors de l'assignation du territoire"
      );

      authFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("JSON invalide");
        },
      } as unknown as Response);
      await store.dispatch(
        assignTerritory({ territoryId: "t1", personId: "p1" })
      );
      expect(store.getState().territories.error).toBe("JSON invalide");
    });

    it("returnTerritory et cancelAssignment : remontent le message du serveur en cas d'erreur", async () => {
      const store = newStore();
      authFetch.mockResolvedValueOnce(
        failing(409, "Aucune attribution en cours")
      );
      await store.dispatch(returnTerritory("t1"));
      expect(store.getState().territories.error).toBe(
        "Aucune attribution en cours"
      );

      authFetch.mockResolvedValueOnce(failing(500, ""));
      await store.dispatch(cancelAssignment("t1"));
      expect(store.getState().territories.error).toBe(
        "Erreur lors de l'annulation de l'assignation"
      );

      authFetch.mockResolvedValueOnce(failing(500, ""));
      await store.dispatch(returnTerritory("t1"));
      expect(store.getState().territories.error).toBe(
        "Erreur lors du retour du territoire"
      );
    });

    it("returnTerritory : met à jour la carte et le territoire sélectionné", async () => {
      const store = newStore({
        territoriesGeojson: collection("ASSIGNED"),
        selectedTerritory: territory({ status: "ASSIGNED" }),
      });
      authFetch.mockResolvedValueOnce(
        ok(assignment({ returnDate: "2026-10-11" }))
      );

      await store.dispatch(returnTerritory("t1"));

      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires/t1/retour",
        expect.objectContaining({ method: "POST" })
      );
      expect(
        store.getState().territories.territoriesGeojson!.features[0].properties
          .lastVisitedOn
      ).toBe("2026-10-11");
      expect(store.getState().territories.selectedTerritory?.status).toBe(
        "PENDING"
      );
    });

    it("cancelAssignment : remet le territoire disponible", async () => {
      const store = newStore({
        territoriesGeojson: collection("ASSIGNED"),
        selectedTerritory: territory({ status: "ASSIGNED" }),
      });
      authFetch.mockResolvedValueOnce(ok(assignment()));

      await store.dispatch(cancelAssignment("t1"));

      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires/t1/annuler-assignation",
        expect.objectContaining({ method: "POST" })
      );
      expect(
        store.getState().territories.territoriesGeojson!.features[0].properties
          .status
      ).toBe("AVAILABLE");
      expect(store.getState().territories.selectedTerritory?.assignedTo).toBe(
        ""
      );
    });

    it("returnTerritory, cancelAssignment, extendTerritory : ignorent un territoire absent du store", async () => {
      const store = newStore({ territoriesGeojson: collection("ASSIGNED") });
      for (const thunk of [
        returnTerritory("x"),
        cancelAssignment("x"),
        extendTerritory({ territoryId: "x" }),
      ]) {
        authFetch.mockResolvedValueOnce(
          ok(assignment({ territory: { territoryId: "x" } }))
        );
        await store.dispatch(thunk as never);
      }
      expect(
        store.getState().territories.territoriesGeojson!.features[0].properties
          .status
      ).toBe("ASSIGNED");

      const empty = newStore();
      for (const thunk of [
        returnTerritory("t1"),
        cancelAssignment("t1"),
        extendTerritory({ territoryId: "t1" }),
      ]) {
        authFetch.mockResolvedValueOnce(ok(assignment()));
        await empty.dispatch(thunk as never);
      }
      expect(empty.getState().territories.territoriesGeojson).toBeNull();
    });

    it("returnTerritory, cancelAssignment, extendTerritory : réponse illisible", async () => {
      const store = newStore();
      for (const thunk of [
        returnTerritory("t1"),
        cancelAssignment("t1"),
        extendTerritory({ territoryId: "t1" }),
        updateAssignmentDates({
          assignmentId: "as1",
          assignmentDate: "2026-01-01",
          dueDate: "2026-05-01",
          returnDate: null,
        }),
      ]) {
        authFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw "illisible";
          },
        } as unknown as Response);
        await store.dispatch(thunk as never);
        expect(store.getState().territories.error).toBe(
          "Une erreur inconnue s'est produite"
        );
      }
    });

    it("extendTerritory : prolonge avec ou sans date et met à jour le territoire", async () => {
      const store = newStore({
        territoriesGeojson: collection("LATE"),
        selectedTerritory: territory({ status: "LATE" }),
      });

      authFetch.mockResolvedValueOnce(ok(assignment()));
      await store.dispatch(extendTerritory({ territoryId: "t1" }));
      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires/t1/prolongation",
        expect.objectContaining({ method: "POST" })
      );

      authFetch.mockResolvedValueOnce(ok(assignment()));
      await store.dispatch(
        extendTerritory({ territoryId: "t1", dueDate: "2027-06-01" })
      );
      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires/t1/prolongation?dueDate=2027-06-01",
        expect.anything()
      );
      expect(
        store.getState().territories.territoriesGeojson!.features[0].properties
          .status
      ).toBe("ASSIGNED");
      expect(store.getState().territories.selectedTerritory?.status).toBe(
        "ASSIGNED"
      );

      authFetch.mockResolvedValueOnce(failing(500, "Erreur métier"));
      await store.dispatch(extendTerritory({ territoryId: "t1" }));
      expect(store.getState().territories.error).toBe("Erreur métier");

      authFetch.mockResolvedValueOnce(failing(500, ""));
      await store.dispatch(extendTerritory({ territoryId: "t1" }));
      expect(store.getState().territories.error).toBe(
        "Erreur lors de la prolongation du territoire"
      );
    });

    it("updateAssignmentDates : envoie les dates et met à jour l'attribution en cours et le statut", async () => {
      const existing = assignment({ id: "as1", assignmentDate: "2026-01-01" });
      const withAssignments = territory({
        status: "LATE",
        assignments: [existing] as never,
      });
      const store = newStore({
        territoriesGeojson: {
          ...collection("LATE"),
          features: [
            { ...collection("LATE").features[0], properties: withAssignments },
          ],
        },
        selectedTerritory: withAssignments,
      });
      const updated = assignment({
        id: "as1",
        assignmentDate: "2026-09-01",
        dueDate: "2027-01-01",
        territory: { territoryId: "t1", status: "ASSIGNED" },
      });
      authFetch.mockResolvedValueOnce(ok(updated));

      await store.dispatch(
        updateAssignmentDates({
          assignmentId: "as1",
          assignmentDate: "2026-09-01",
          dueDate: "2027-01-01",
          returnDate: null,
        })
      );

      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/attributions/as1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            assignmentDate: "2026-09-01",
            dueDate: "2027-01-01",
            returnDate: null,
          }),
        })
      );
      const props =
        store.getState().territories.territoriesGeojson!.features[0].properties;
      expect(props.status).toBe("ASSIGNED");
      expect(props.assignedOn).toBe("2026-09-01");
      expect(props.assignments[0].assignmentDate).toBe("2026-09-01");
      const selected = store.getState().territories.selectedTerritory!;
      expect(selected.waitedFor).toBe("2027-01-01");
      expect(selected.lastVisitedOn).toBe("nouveau");
      expect(store.getState().territories.updating).toBe(false);
      // La page du territoire reste affichée pendant l'enregistrement
      expect(store.getState().territories.loading).toBe(false);
    });

    it("updateAssignmentDates : un retour antidaté met à jour le dernier parcours sans toucher à l'attribution en cours", async () => {
      const returned = assignment({
        id: "as0",
        assignmentDate: "2026-01-01",
        returnDate: "2026-03-01",
      });
      const older = assignment({
        id: "as-old",
        assignmentDate: "2025-01-01",
        returnDate: "2025-02-01",
      });
      const store = newStore({
        selectedTerritory: territory({
          status: "PENDING",
          assignments: [older, returned] as never,
          lastVisitedOn: "2026-03-01",
          assignedOn: "N/A",
        }),
      });
      authFetch.mockResolvedValueOnce(
        ok(
          assignment({
            id: "as0",
            assignmentDate: "2025-03-01",
            returnDate: "2025-05-01",
            territory: { territoryId: "t1", status: "AVAILABLE" },
          })
        )
      );

      await store.dispatch(
        updateAssignmentDates({
          assignmentId: "as0",
          assignmentDate: "2025-03-01",
          dueDate: "2025-07-01",
          returnDate: "2025-05-01",
        })
      );

      const selected = store.getState().territories.selectedTerritory!;
      expect(selected.status).toBe("AVAILABLE");
      expect(selected.lastVisitedOn).toBe("2025-05-01");
      expect(selected.assignedOn).toBe("N/A");
    });

    it("updateAssignmentDates : tolère des attributions absentes et les erreurs", async () => {
      const dates = {
        assignmentId: "as1",
        assignmentDate: "2026-09-01",
        dueDate: "2027-01-01",
        returnDate: null,
      };
      const store = newStore({
        // Valeur inattendue (non tableau) côté carte : remplacée par l'attribution reçue
        territoriesGeojson: {
          ...collection(),
          features: [
            {
              ...collection().features[0],
              properties: territory({ assignments: "inattendu" as never }),
            },
          ],
        },
        selectedTerritory: territory({ assignments: undefined as never }),
      });
      authFetch.mockResolvedValueOnce(ok(assignment()));
      await store.dispatch(updateAssignmentDates(dates));
      expect(
        store.getState().territories.selectedTerritory?.assignments
      ).toHaveLength(1);
      expect(
        store.getState().territories.territoriesGeojson!.features[0].properties
          .assignments
      ).toHaveLength(1);

      authFetch.mockResolvedValueOnce(ok({ territory: null }));
      await store.dispatch(updateAssignmentDates(dates));
      expect(store.getState().territories.updating).toBe(false);

      authFetch.mockResolvedValueOnce({
        ...failing(400),
        json: async () => ({ error: "Date invalide" }),
      } as Response);
      await store.dispatch(updateAssignmentDates(dates));
      expect(store.getState().territories.error).toBe("Date invalide");
      expect(store.getState().territories.updating).toBe(false);

      authFetch.mockResolvedValueOnce(failing(500));
      await store.dispatch(updateAssignmentDates(dates));
      expect(store.getState().territories.error).toBe(
        "Erreur lors de la modification des dates d'attribution"
      );
    });
  });

  describe("adresses à ne pas visiter", () => {
    const address = {
      street: "rue B",
      number: "2",
      zipCode: "35000",
      city: "Rennes",
    };

    it("ajoute, modifie et supprime une adresse du territoire sélectionné", async () => {
      const store = newStore({ selectedTerritory: territory() });

      authFetch.mockResolvedValueOnce(ok({ id: "a2", ...address }));
      await store.dispatch(
        addAddressNotToVisit({ territoryId: "t1", address })
      );
      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires/t1/adresses-a-ne-pas-visiter",
        expect.objectContaining({ method: "POST" })
      );
      expect(
        store.getState().territories.selectedTerritory?.addressesNotToDo
      ).toHaveLength(2);

      authFetch.mockResolvedValueOnce(
        ok({ id: "a2", ...address, number: "4" })
      );
      await store.dispatch(
        modifyAddressNotToVisit({
          territoryId: "t1",
          addressId: "a2",
          address: { ...address, number: "4" },
        })
      );
      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires/t1/adresses-a-ne-pas-visiter/a2",
        expect.objectContaining({ method: "PUT" })
      );
      expect(
        store.getState().territories.selectedTerritory?.addressesNotToDo[1]
          .number
      ).toBe("4");

      authFetch.mockResolvedValueOnce(ok({ id: "inconnue", ...address }));
      await store.dispatch(
        modifyAddressNotToVisit({
          territoryId: "t1",
          addressId: "inconnue",
          address,
        })
      );
      expect(
        store.getState().territories.selectedTerritory?.addressesNotToDo
      ).toHaveLength(2);

      authFetch.mockResolvedValueOnce(ok(null));
      await store.dispatch(
        deleteAddressNotToVisit({ territoryId: "t1", addressId: "a2" })
      );
      expect(authFetch).toHaveBeenLastCalledWith(
        "/api/territoires/t1/adresses-a-ne-pas-visiter/a2",
        { method: "DELETE" }
      );
      expect(
        store
          .getState()
          .territories.selectedTerritory?.addressesNotToDo.map((a) => a.id)
      ).toEqual(["a1"]);
      expect(store.getState().territories.updating).toBe(false);
    });

    it("sans territoire sélectionné, ne modifie rien", async () => {
      const store = newStore();
      for (const thunk of [
        addAddressNotToVisit({ territoryId: "t1", address }),
        modifyAddressNotToVisit({
          territoryId: "t1",
          addressId: "a1",
          address,
        }),
        deleteAddressNotToVisit({ territoryId: "t1", addressId: "a1" }),
      ]) {
        authFetch.mockResolvedValueOnce(ok({ id: "a1", ...address }));
        await store.dispatch(thunk as never);
      }
      expect(store.getState().territories.selectedTerritory).toBeNull();
    });

    it.each([
      [
        "addAddressNotToVisit",
        () => addAddressNotToVisit({ territoryId: "t1", address }),
        "Erreur lors de l'ajout de l'adresse : Erreur serveur",
      ],
      [
        "modifyAddressNotToVisit",
        () =>
          modifyAddressNotToVisit({
            territoryId: "t1",
            addressId: "a1",
            address,
          }),
        "Erreur lors de la modification de l'adresse : Erreur serveur",
      ],
      [
        "deleteAddressNotToVisit",
        () => deleteAddressNotToVisit({ territoryId: "t1", addressId: "a1" }),
        "Erreur lors de la suppression de l'adresse : Erreur serveur",
      ],
    ])(
      "%s : signale les erreurs HTTP, réseau et inconnues",
      async (_name, thunk, message) => {
        const store = newStore({ selectedTerritory: territory() });

        authFetch.mockResolvedValueOnce(failing());
        await store.dispatch(thunk() as never);
        expect(store.getState().territories.error).toBe(message);
        expect(store.getState().territories.updating).toBe(false);

        authFetch.mockRejectedValueOnce(new Error("réseau coupé"));
        await store.dispatch(thunk() as never);
        expect(store.getState().territories.error).toBe("réseau coupé");

        authFetch.mockRejectedValueOnce(null);
        await store.dispatch(thunk() as never);
        expect(store.getState().territories.error).toBe(
          "Une erreur inconnue s'est produite"
        );
      }
    );
  });
});
