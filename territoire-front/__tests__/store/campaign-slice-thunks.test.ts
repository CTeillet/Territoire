import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import campaignReducer, {
  clearCampaignMap,
  closeCampaign,
  createCampaign,
  createCampaignWithRemainingTerritories,
  deleteCampaign,
  exportCampaignStatistics,
  fetchCampaign,
  fetchCampaignMap,
  fetchCampaigns,
  fetchCampaignStatistics,
  updateRemainingTerritories,
} from "@/store/slices/campaign-slice";
import * as authFetchModule from "@/utils/auth-fetch";
import { toast } from "sonner";
import { saveAs } from "file-saver";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

type State = ReturnType<typeof campaignReducer>;

const newStore = (preloaded: Partial<State> = {}) =>
  configureStore({
    reducer: { campaigns: campaignReducer },
    preloadedState: {
      campaigns: {
        ...campaignReducer(undefined, { type: "init" }),
        ...preloaded,
      },
    },
  });

const ok = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => body,
    blob: async () => new Blob(["x"]),
  }) as Response;
const failing = (): Response =>
  ({ ok: false, status: 500, json: async () => ({}) }) as Response;
const unreadable = (thrown: unknown = new Error("JSON invalide")): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => {
      throw thrown;
    },
    blob: async () => {
      throw thrown;
    },
  }) as unknown as Response;

const campaign = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "Campagne d'automne",
  closed: false,
  territories: [],
  remainingTerritories: [],
  ...overrides,
});

describe("campaign-slice : thunks et reducers", () => {
  let authFetch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.error).mockClear();
    vi.mocked(saveAs).mockClear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    authFetch = vi.spyOn(authFetchModule, "authFetch");
  });

  it("fetchCampaigns : charge la liste, signale les erreurs", async () => {
    const store = newStore();
    authFetch.mockResolvedValueOnce(ok([campaign()]));
    await store.dispatch(fetchCampaigns());
    expect(authFetch).toHaveBeenLastCalledWith("/api/campagnes");
    expect(store.getState().campaigns.campaigns).toHaveLength(1);
    expect(store.getState().campaigns.isFetchingCampaigns).toBe(false);

    authFetch.mockResolvedValueOnce(failing());
    await store.dispatch(fetchCampaigns());
    expect(store.getState().campaigns.error).toBe(
      "Erreur lors de la récupération des campagnes"
    );
    expect(toast.error).toHaveBeenLastCalledWith(
      "Erreur lors de la récupération des campagnes"
    );

    authFetch.mockResolvedValueOnce(unreadable());
    await store.dispatch(fetchCampaigns());
    expect(store.getState().campaigns.error).toBe("JSON invalide");

    authFetch.mockResolvedValueOnce(unreadable("bizarre"));
    await store.dispatch(fetchCampaigns());
    expect(store.getState().campaigns.error).toBe(
      "Une erreur inconnue s'est produite"
    );
  });

  it("fetchCampaigns : ignore une seconde demande pendant un chargement", async () => {
    const store = newStore({ isFetchingCampaigns: true });

    await store.dispatch(fetchCampaigns());

    expect(authFetch).not.toHaveBeenCalled();
  });

  it("fetchCampaign : charge une campagne, ignore les doublons et signale les erreurs", async () => {
    const store = newStore();
    authFetch.mockResolvedValueOnce(ok(campaign()));
    await store.dispatch(fetchCampaign("c1"));
    expect(authFetch).toHaveBeenLastCalledWith("/api/campagnes/c1");
    expect(store.getState().campaigns.currentCampaign?.id).toBe("c1");

    authFetch.mockResolvedValueOnce(failing());
    await store.dispatch(fetchCampaign("c1"));
    expect(store.getState().campaigns.error).toBe(
      "Erreur lors de la récupération de la campagne"
    );

    authFetch.mockResolvedValueOnce(unreadable());
    await store.dispatch(fetchCampaign("c1"));
    expect(store.getState().campaigns.error).toBe("JSON invalide");

    const busy = newStore({ isFetchingCampaign: true });
    await busy.dispatch(fetchCampaign("c1"));
    expect(authFetch).toHaveBeenCalledTimes(3);
  });

  it("createCampaign et createCampaignWithRemainingTerritories : ajoutent la campagne créée", async () => {
    const store = newStore();
    authFetch.mockResolvedValueOnce(ok(campaign()));
    await store.dispatch(createCampaign({ name: "Campagne d'automne" }));
    expect(authFetch).toHaveBeenLastCalledWith(
      "/api/campagnes",
      expect.objectContaining({ method: "POST" })
    );

    authFetch.mockResolvedValueOnce(ok(campaign({ id: "c2" })));
    await store.dispatch(
      createCampaignWithRemainingTerritories({
        previousCampaignId: "c1",
        newCampaign: { name: "Suite" },
      })
    );
    expect(authFetch).toHaveBeenLastCalledWith(
      "/api/campagnes/avec-territoires-restants/c1",
      expect.objectContaining({ method: "POST" })
    );

    expect(store.getState().campaigns.campaigns.map((c) => c.id)).toEqual([
      "c1",
      "c2",
    ]);
    expect(store.getState().campaigns.creating).toBe(false);
  });

  it.each([
    [
      "createCampaign",
      () => createCampaign({ name: "x" }),
      "Échec de la création de la campagne",
    ],
    [
      "createCampaignWithRemainingTerritories",
      () =>
        createCampaignWithRemainingTerritories({
          previousCampaignId: "c1",
          newCampaign: {},
        }),
      "Échec de la création de la campagne avec territoires restants",
    ],
    [
      "updateRemainingTerritories",
      () => updateRemainingTerritories({ campaignId: "c1", territories: [] }),
      "Échec de la mise à jour des territoires restants",
    ],
    [
      "closeCampaign",
      () => closeCampaign("c1"),
      "Échec de la clôture de la campagne",
    ],
    [
      "fetchCampaignStatistics",
      () => fetchCampaignStatistics("c1"),
      "Erreur lors de la récupération des statistiques de la campagne",
    ],
    [
      "fetchCampaignMap",
      () => fetchCampaignMap("c1"),
      "Erreur lors de la récupération du GeoJSON de la campagne",
    ],
  ])(
    "%s : signale l'erreur HTTP et une réponse illisible",
    async (_name, thunk, message) => {
      const store = newStore();

      authFetch.mockResolvedValueOnce(failing());
      await store.dispatch(thunk() as never);
      expect(store.getState().campaigns.error).toBe(message);
      expect(toast.error).toHaveBeenLastCalledWith(message);

      authFetch.mockResolvedValueOnce(unreadable("bizarre"));
      await store.dispatch(thunk() as never);
      expect(store.getState().campaigns.error).toBe(
        "Une erreur inconnue s'est produite"
      );

      authFetch.mockResolvedValueOnce(unreadable());
      await store.dispatch(thunk() as never);
      expect(store.getState().campaigns.error).toBe("JSON invalide");
    }
  );

  it("updateRemainingTerritories et closeCampaign : mettent à jour la campagne courante et la liste", async () => {
    const store = newStore({
      campaigns: [campaign(), campaign({ id: "c2" })] as never,
    });

    authFetch.mockResolvedValueOnce(
      ok(campaign({ remainingTerritories: [{ territoryId: "t1" }] }))
    );
    await store.dispatch(
      updateRemainingTerritories({
        campaignId: "c1",
        territories: [{ territoryId: "t1" } as never],
      })
    );
    expect(authFetch).toHaveBeenLastCalledWith(
      "/api/campagnes/c1/territoires-restants",
      expect.objectContaining({ method: "PUT" })
    );
    expect(
      store.getState().campaigns.campaigns[0].remainingTerritories
    ).toHaveLength(1);

    authFetch.mockResolvedValueOnce(ok(campaign({ closed: true })));
    await store.dispatch(closeCampaign("c1"));
    expect(authFetch).toHaveBeenLastCalledWith("/api/campagnes/c1/fermer", {
      method: "PUT",
    });
    expect(store.getState().campaigns.currentCampaign?.closed).toBe(true);
    expect(store.getState().campaigns.campaigns[0].closed).toBe(true);

    // Campagne absente de la liste : seule la campagne courante change
    authFetch.mockResolvedValueOnce(
      ok(campaign({ id: "autre", closed: true }))
    );
    await store.dispatch(closeCampaign("autre"));
    authFetch.mockResolvedValueOnce(ok(campaign({ id: "autre" })));
    await store.dispatch(
      updateRemainingTerritories({ campaignId: "autre", territories: [] })
    );
    expect(store.getState().campaigns.campaigns).toHaveLength(2);
    expect(store.getState().campaigns.currentCampaign?.id).toBe("autre");
  });

  it("deleteCampaign : retire la campagne de la liste et de la sélection", async () => {
    const store = newStore({
      campaigns: [campaign(), campaign({ id: "c2" })] as never,
      currentCampaign: campaign() as never,
    });

    authFetch.mockResolvedValueOnce(ok(null));
    await store.dispatch(deleteCampaign("c1"));
    expect(authFetch).toHaveBeenLastCalledWith("/api/campagnes/c1", {
      method: "DELETE",
    });
    expect(store.getState().campaigns.campaigns.map((c) => c.id)).toEqual([
      "c2",
    ]);
    expect(store.getState().campaigns.currentCampaign).toBeNull();

    authFetch.mockResolvedValueOnce(ok(null));
    await store.dispatch(deleteCampaign("c2"));
    expect(store.getState().campaigns.campaigns).toHaveLength(0);

    authFetch.mockResolvedValueOnce(failing());
    await store.dispatch(deleteCampaign("c3"));
    expect(store.getState().campaigns.error).toBe(
      "Échec de la suppression de la campagne"
    );
    expect(store.getState().campaigns.deleting).toBe(false);
  });

  it("fetchCampaignStatistics et fetchCampaignMap : chargent les données, sans doublon", async () => {
    const store = newStore();
    authFetch.mockResolvedValueOnce(ok({ totalTerritories: 10 }));
    await store.dispatch(fetchCampaignStatistics("c1"));
    expect(authFetch).toHaveBeenLastCalledWith(
      "/api/campagnes/c1/statistiques"
    );
    expect(store.getState().campaigns.campaignStatistics).toEqual({
      totalTerritories: 10,
    });

    authFetch.mockResolvedValueOnce(
      ok({ type: "FeatureCollection", features: [] })
    );
    await store.dispatch(fetchCampaignMap("c1"));
    expect(authFetch).toHaveBeenLastCalledWith("/api/campagnes/c1/geojson");
    expect(store.getState().campaigns.currentCampaignGeoJson).toEqual({
      type: "FeatureCollection",
      features: [],
    });

    store.dispatch(clearCampaignMap());
    expect(store.getState().campaigns.currentCampaignGeoJson).toBeNull();

    const busy = newStore({ loadingStatistics: true, loadingMap: true });
    await busy.dispatch(fetchCampaignStatistics("c1"));
    await busy.dispatch(fetchCampaignMap("c1"));
    expect(authFetch).toHaveBeenCalledTimes(2);
  });

  it("exportCampaignStatistics : télécharge le fichier Excel nommé d'après la campagne", async () => {
    const store = newStore();
    authFetch.mockResolvedValueOnce(ok(null));

    const result = await store.dispatch(
      exportCampaignStatistics({
        campaignId: "c1",
        campaignName: "Campagne d'automne 2026",
      })
    );

    expect(authFetch).toHaveBeenLastCalledWith(
      "/api/campagnes/c1/export/excel"
    );
    expect(result.payload).toBe("c1");
    expect(vi.mocked(saveAs).mock.calls[0][1]).toMatch(
      /^Statistiques_Campagne_Campagne_d'automne_2026_\d{4}-\d{2}-\d{2}\.xlsx$/
    );
  });

  it("exportCampaignStatistics : signale les erreurs", async () => {
    const store = newStore();
    authFetch.mockResolvedValueOnce(failing());
    expect(
      (
        await store.dispatch(
          exportCampaignStatistics({ campaignId: "c1", campaignName: "x" })
        )
      ).payload
    ).toBe("Erreur lors de l'exportation des statistiques");

    authFetch.mockResolvedValueOnce(
      unreadable(new Error("téléchargement interrompu"))
    );
    expect(
      (
        await store.dispatch(
          exportCampaignStatistics({ campaignId: "c1", campaignName: "x" })
        )
      ).payload
    ).toBe("téléchargement interrompu");

    authFetch.mockResolvedValueOnce(unreadable("bizarre"));
    expect(
      (
        await store.dispatch(
          exportCampaignStatistics({ campaignId: "c1", campaignName: "x" })
        )
      ).payload
    ).toBe("Une erreur lors du téléchargement du fichier");
  });
});
