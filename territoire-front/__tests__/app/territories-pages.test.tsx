import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TerritoryPage from "@/app/(app)/territoires/page";
import NonVisitedTerritoriesPage from "@/app/(app)/territoires/non-parcourus/page";
import LoginPage from "@/app/(app)/login/page";
import CreateTerritoryModal from "@/components/territory/create-territory-modal";
import * as XLSX from "xlsx";
import {
  jsonResponse,
  mockApi,
  renderWithStore,
  TEST_CITY,
} from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/territory/territory-map", () => ({
  default: () => <div data-testid="territory-map" />,
}));
vi.mock("xlsx", async (importOriginal) => ({
  ...(await importOriginal<typeof import("xlsx")>()),
  writeFile: vi.fn(),
}));

const props = (
  id: string,
  name: string,
  status: string,
  extra: Record<string, unknown> = {}
) => ({
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: {
    id,
    name,
    status,
    city: "Rennes",
    type: "HOUSE",
    lastVisitedOn: "2020-01-01",
    assignedTo: "N/A",
    assignedOn: "N/A",
    waitedFor: "N/A",
    ...extra,
  },
});

const collection = {
  type: "FeatureCollection",
  features: [
    props("t1", "R-12", "AVAILABLE"),
    props("t2", "A-01", "LATE", { type: "BUILDING", lastVisitedOn: "nouveau" }),
    props("t3", "C-05", "PENDING", {
      city: "Cesson",
      type: null,
      lastVisitedOn: "nouveau",
    }),
    props("t4", "B-02", "ASSIGNED", { lastVisitedOn: "2026-10-01" }),
    props("t5", "D-09", "AVAILABLE", {
      lastVisitedOn: new Date().toISOString().slice(0, 10),
    }),
  ],
};

const rowNames = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).queryAllByRole("cell")[0]?.textContent);

describe("Liste des territoires", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    localStorage.clear();
    push.mockClear();
    vi.mocked(XLSX.writeFile).mockClear();
  });

  it("affiche la carte, le tableau et la création réservée aux responsables", async () => {
    mockApi({
      "GET /api/territoires/geojson": collection,
      "GET /api/personnes": [],
    });
    renderWithStore(<TerritoryPage />);

    expect(await screen.findByTestId("territory-map")).toBeInTheDocument();
    expect(screen.getByText("Créer un territoire")).toBeInTheDocument();
    expect(screen.getByText("R-12")).toBeInTheDocument();
    expect(screen.getAllByText("En retard").length).toBeGreaterThan(0);
    expect(screen.getByText("Immeuble")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("trie, filtre, réinitialise les filtres et les mémorise", async () => {
    mockApi({
      "GET /api/territoires/geojson": collection,
      "GET /api/personnes": [],
    });
    renderWithStore(<TerritoryPage />);
    await screen.findByText("R-12");

    // Tri descendant sur le nom
    await userEvent.click(screen.getByRole("button", { name: /Territoire/ }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: /Descendant/ })
    );
    expect(rowNames()[0]).toBe("R-12");

    // Filtre texte sur la ville
    await userEvent.click(screen.getByRole("button", { name: /Ville/ }));
    fireEvent.change(await screen.findByPlaceholderText("Filtrer Ville"), {
      target: { value: "Cesson" },
    });
    await userEvent.keyboard("{Escape}");
    expect(rowNames()).toEqual(["C-05"]);
    expect(
      JSON.parse(localStorage.getItem("tableFilters-territories")!)
    ).toEqual([{ id: "city", value: "Cesson" }]);

    await userEvent.click(screen.getByText("Réinitialiser les filtres"));
    expect(rowNames()).toHaveLength(5);

    // Filtre de statut puis de type
    await userEvent.click(screen.getByRole("button", { name: /Statut/ }));
    fireEvent.change(
      within(await screen.findByRole("menu")).getByRole("combobox"),
      { target: { value: "LATE" } }
    );
    await userEvent.keyboard("{Escape}");
    expect(rowNames()).toEqual(["A-01"]);
    await userEvent.click(screen.getByText("Réinitialiser les filtres"));

    await userEvent.click(screen.getByRole("button", { name: /^Type/ }));
    fireEvent.change(
      within(await screen.findByRole("menu")).getByRole("combobox"),
      { target: { value: "BUILDING" } }
    );
    await userEvent.keyboard("{Escape}");
    expect(rowNames()).toEqual(["A-01"]);

    // Filtre vide = suppression du filtre
    await userEvent.click(screen.getByRole("button", { name: /^Type/ }));
    fireEvent.change(
      within(await screen.findByRole("menu")).getByRole("combobox"),
      { target: { value: "" } }
    );
    await userEvent.keyboard("{Escape}");
    expect(rowNames()).toHaveLength(5);
  });

  it("restaure le tri et les filtres mémorisés, et ignore un stockage corrompu", async () => {
    localStorage.setItem(
      "tableSorting-territories",
      JSON.stringify([{ id: "name", desc: false }])
    );
    localStorage.setItem(
      "tableFilters-territories",
      JSON.stringify([{ id: "status", value: "AVAILABLE" }])
    );
    mockApi({
      "GET /api/territoires/geojson": collection,
      "GET /api/personnes": [],
    });
    const { unmount } = renderWithStore(<TerritoryPage />);
    await screen.findByText("R-12");
    expect(rowNames()).toEqual(["D-09", "R-12"]);
    unmount();

    localStorage.setItem("tableSorting-territories", "{corrompu");
    localStorage.removeItem("tableFilters-territories");
    renderWithStore(<TerritoryPage />);
    expect(await screen.findByText("R-12")).toBeInTheDocument();
  });

  it("exporte les lignes filtrées en Excel avec des en-têtes et valeurs traduits", async () => {
    mockApi({
      "GET /api/territoires/geojson": collection,
      "GET /api/personnes": [],
    });
    const jsonToSheet = vi.spyOn(XLSX.utils, "json_to_sheet");
    renderWithStore(<TerritoryPage />);
    await screen.findByText("R-12");

    await userEvent.click(screen.getByText("Exporter"));

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "table_data.xlsx"
    );
    const rows = jsonToSheet.mock.calls[0][0] as Record<string, unknown>[];
    expect(rows[0]).toEqual(
      expect.objectContaining({
        Territoire: "R-12",
        Statut: "Disponible",
        Type: "Pavillon",
      })
    );
    expect(rows[0]).not.toHaveProperty("Actions");
  });

  it("n'affiche pas la création à un simple utilisateur et indique un tableau vide", async () => {
    mockApi({
      "GET /api/territoires/geojson": {
        type: "FeatureCollection",
        features: [],
      },
      "GET /api/personnes": [],
    });
    renderWithStore(<TerritoryPage />, "UTILISATEUR");

    expect(await screen.findByText("Aucun résultat.")).toBeInTheDocument();
    expect(screen.queryByText("Créer un territoire")).not.toBeInTheDocument();
  });

  it("redirige vers la connexion sans utilisateur connecté", async () => {
    mockApi({});
    renderWithStore(<TerritoryPage />, null);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
});

describe("Création d'un territoire", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    push.mockClear();
  });

  it("crée le territoire puis ouvre sa fiche", async () => {
    const api = mockApi({
      "POST /api/territoires": {
        id: "t9",
        name: "Nord",
        status: "AVAILABLE",
        city: TEST_CITY,
      },
      "GET /api/territoires/geojson": collection,
    });
    renderWithStore(<CreateTerritoryModal />);

    await userEvent.click(screen.getByText("Créer un territoire"));
    await userEvent.type(
      screen.getByPlaceholderText("Ex: Quartier Nord"),
      "Nord"
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Rennes" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/territoires/t9"));
    expect(api).toHaveBeenCalledWith(
      "/api/territoires",
      expect.objectContaining({
        body: JSON.stringify({ name: "Nord", cityId: "c1" }),
      })
    );
  });

  it("exige le nom et la ville", async () => {
    const api = mockApi({});
    renderWithStore(<CreateTerritoryModal />);

    await userEvent.click(screen.getByText("Créer un territoire"));
    await userEvent.click(screen.getByRole("button", { name: "Valider" }));

    expect(await screen.findByText("Le nom est requis")).toBeInTheDocument();
    expect(screen.getByText("La ville est requise")).toBeInTheDocument();
    expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      false
    );
  });

  it("journalise l'échec de la création", async () => {
    mockApi({ "POST /api/territoires": jsonResponse({}, 500) });
    renderWithStore(<CreateTerritoryModal />);

    await userEvent.click(screen.getByText("Créer un territoire"));
    await userEvent.type(
      screen.getByPlaceholderText("Ex: Quartier Nord"),
      "Nord"
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Rennes" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Erreur lors de la création du territoire :",
        expect.anything()
      )
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("charge les villes si besoin et indique leur absence", async () => {
    const api = mockApi({ "GET /api/villes": [] });
    renderWithStore(<CreateTerritoryModal />, "ADMIN", {
      cities: { cities: [] },
    });

    await userEvent.click(screen.getByText("Créer un territoire"));
    await userEvent.click(screen.getByRole("combobox"));

    expect(
      (await screen.findAllByText("Aucune ville disponible")).length
    ).toBeGreaterThan(0);
    expect(api).toHaveBeenCalledWith("/api/villes");
  });
});

describe("Territoires non parcourus", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    localStorage.clear();
    push.mockClear();
  });

  it("ne liste que les territoires disponibles ou en attente non parcourus depuis septembre", async () => {
    mockApi({
      "GET /api/territoires/geojson": collection,
      "GET /api/personnes": [],
    });
    renderWithStore(<NonVisitedTerritoriesPage />);

    expect(await screen.findByText("R-12")).toBeInTheDocument();
    expect(screen.getByText("C-05")).toBeInTheDocument();
    // En retard ou attribué : exclus ; parcouru récemment : exclu
    expect(screen.queryByText("A-01")).not.toBeInTheDocument();
    expect(screen.queryByText("B-02")).not.toBeInTheDocument();
    expect(screen.queryByText("D-09")).not.toBeInTheDocument();
    expect(
      screen.getByText(/non parcourus depuis le 1er septembre/)
    ).toBeInTheDocument();
  });

  it("affiche l'état vide et redirige sans connexion", async () => {
    mockApi({
      "GET /api/territoires/geojson": {
        type: "FeatureCollection",
        features: [props("t4", "B-02", "ASSIGNED")],
      },
    });
    const { unmount } = renderWithStore(<NonVisitedTerritoriesPage />);
    expect(
      await screen.findByText("Aucun territoire en retard")
    ).toBeInTheDocument();
    unmount();

    mockApi({});
    renderWithStore(<NonVisitedTerritoriesPage />, null);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
});

describe("Page de connexion", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    push.mockClear();
  });

  const login = async (email = "admin@exemple.fr", password = "motdepasse") => {
    await userEvent.type(screen.getByLabelText("Email"), email);
    await userEvent.type(screen.getByLabelText("Mot de passe"), password);
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));
  };

  it("connecte l'utilisateur puis l'envoie au tableau de bord", async () => {
    const api = mockApi({
      "POST /api/authentification/connexion": {
        user: {
          id: "u1",
          email: "admin@exemple.fr",
          username: "Admin",
          role: "ADMIN",
        },
        token: "jeton",
      },
    });
    const { store } = renderWithStore(<LoginPage />, null);

    await login();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(store.getState().auth.user?.username).toBe("Admin");
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({
      email: "admin@exemple.fr",
      password: "motdepasse",
    });
  });

  it.each([
    [
      jsonResponse({ error: "Identifiants incorrects" }, 401),
      "Identifiants incorrects. Veuillez réessayer.",
    ],
    [
      jsonResponse(
        { error: "Trop de tentatives. Réessayez dans 3 minute(s)." },
        429
      ),
      "Trop de tentatives. Réessayez dans 3 minute(s).",
    ],
    [
      {
        ok: false,
        status: 429,
        json: async () => {
          throw new Error();
        },
      },
      "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
    ],
  ])("affiche l'erreur adaptée (%#)", async (response, message) => {
    mockApi({ "POST /api/authentification/connexion": response });
    renderWithStore(<LoginPage />, null);

    await login();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("distingue une panne réseau d'identifiants incorrects", async () => {
    mockApi({}).mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithStore(<LoginPage />, null);

    await login();

    expect(
      await screen.findByText(
        "Connexion impossible. Vérifiez votre réseau et réessayez."
      )
    ).toBeInTheDocument();
  });
});
