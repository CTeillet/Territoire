import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TerritoryPage from "@/app/(app)/territoires/page";
import NonVisitedTerritoriesPage from "@/app/(app)/territoires/non-parcourus/page";
import LoginPage from "@/app/(app)/login/page";
import CreateTerritoryModal from "@/components/territory/create-territory-modal";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
  jsonResponse,
  mockApi,
  renderWithStore,
  TEST_CITY,
} from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// Carte simulée : elle expose les territoires reçus et si elle doit se recadrer sur eux
vi.mock("@/components/territory/territory-map", () => ({
  default: ({
    geoJsonData,
    fitToData,
    focusPoint,
  }: {
    geoJsonData: { features: { properties: { name: string } }[] };
    fitToData?: boolean;
    focusPoint?: { label: string } | null;
  }) => (
    <div
      data-testid="territory-map"
      data-names={geoJsonData.features.map((f) => f.properties.name).join(",")}
      data-fit={String(!!fitToData)}
      data-focus={focusPoint?.label ?? ""}
    />
  ),
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

    // Filtre sur la ville, choisie parmi celles du tableau
    await userEvent.click(screen.getByRole("button", { name: /Ville/ }));
    const citySelect = within(await screen.findByRole("menu")).getByRole(
      "combobox"
    );
    expect(
      within(citySelect)
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual(["Toutes", "Cesson", "Rennes"]);
    fireEvent.change(citySelect, { target: { value: "Cesson" } });
    await userEvent.keyboard("{Escape}");
    expect(rowNames()).toEqual(["C-05"]);
    // La carte ne montre plus que les territoires du tableau, et se recadre sur eux
    expect(screen.getByTestId("territory-map")).toHaveAttribute(
      "data-names",
      "C-05"
    );
    expect(screen.getByTestId("territory-map")).toHaveAttribute(
      "data-fit",
      "true"
    );
    expect(screen.getByTestId("territory-count")).toHaveTextContent(
      "1 territoire sur 5"
    );
    expect(
      JSON.parse(localStorage.getItem("tableFilters-territories")!)
    ).toEqual([{ id: "city", value: "Cesson" }]);

    await userEvent.click(screen.getByText("Réinitialiser les filtres"));
    expect(rowNames()).toHaveLength(5);
    expect(screen.getByTestId("territory-count")).toHaveTextContent(
      "5 territoires"
    );
    expect(screen.getByTestId("territory-map")).toHaveAttribute(
      "data-fit",
      "false"
    );

    // Plusieurs statuts à la fois, puis le type
    await userEvent.click(screen.getByRole("button", { name: /Statut/ }));
    await userEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "En retard" })
    );
    await userEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "En attente" })
    );
    await userEvent.keyboard("{Escape}");
    // Toujours triés par nom décroissant
    expect(rowNames()).toEqual(["C-05", "A-01"]);
    expect(
      JSON.parse(localStorage.getItem("tableFilters-territories")!)
    ).toEqual([{ id: "status", value: ["LATE", "PENDING"] }]);
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

    // Bibliothèque chargée au clic : l'export arrive juste après
    const today = format(new Date(), "yyyy-MM-dd");
    await waitFor(() =>
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        `territoires_${today}.xlsx`
      )
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

describe("Recherche de territoires", () => {
  // R-120 et V-112 avant R-12 : l'ordre des résultats vient de leur pertinence, pas des données
  const searchable = {
    type: "FeatureCollection",
    features: [
      props("s1", "R-120", "AVAILABLE"),
      props("s2", "V-112", "AVAILABLE", { city: "Vannes" }),
      props("s3", "R-12", "AVAILABLE"),
      props("s4", "A-01", "ASSIGNED", { assignedTo: "Élodie Martin" }),
      props("s5", "C-05", "PENDING", { note: "Digicode 1234 au portail" }),
      props("s6", "Centre-3", "AVAILABLE", { city: "Évry" }),
    ],
  };

  const renderPage = async () => {
    mockApi({
      "GET /api/territoires/geojson": searchable,
      "GET /api/personnes": [],
    });
    const view = renderWithStore(<TerritoryPage />);
    await screen.findByText("R-12");
    return view;
  };

  const searchBox = () =>
    screen.getByRole("searchbox", { name: "Rechercher un territoire" });

  const search = async (text: string) => {
    await userEvent.clear(searchBox());
    if (text) await userEvent.type(searchBox(), text);
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    localStorage.clear();
    sessionStorage.clear();
    push.mockClear();
  });

  it("trouve un territoire sans tenir compte des majuscules, tirets ni espaces", async () => {
    await renderPage();

    for (const text of ["r12", "R 12", "r-12"]) {
      await search(text);
      // R-12, identique à la recherche, passe avant R-120 qui ne fait que commencer pareil
      expect(rowNames()).toEqual(["R-12", "R-120"]);
    }
    expect(screen.getByTestId("territory-count")).toHaveTextContent(
      "2 territoires sur 6"
    );
  });

  it("classe les résultats les plus pertinents en premier", async () => {
    await renderPage();

    await search("12");

    // Numéro exact, puis noms qui le contiennent, puis la note
    expect(rowNames()).toEqual(["R-12", "R-120", "V-112", "C-05"]);
  });

  it("garde la pertinence en tête quand un tri est choisi, le tri départageant les autres", async () => {
    localStorage.setItem(
      "tableSorting-territories",
      JSON.stringify([{ id: "name", desc: true }])
    );
    await renderPage();

    await search("12");

    expect(rowNames()).toEqual(["R-12", "V-112", "R-120", "C-05"]);
    // La recherche n'est pas mémorisée avec le tri ni avec les filtres du tableau
    expect(
      JSON.parse(localStorage.getItem("tableSorting-territories")!)
    ).toEqual([{ id: "name", desc: true }]);
    expect(localStorage.getItem("tableFilters-territories")).toBe("[]");
  });

  it("cherche aussi dans la ville, la personne et la note, sans les accents", async () => {
    await renderPage();

    await search("elodie");
    expect(rowNames()).toEqual(["A-01"]);
    await search("martin élodie");
    expect(rowNames()).toEqual(["A-01"]);
    await search("evry");
    expect(rowNames()).toEqual(["Centre-3"]);
    await search("digicode");
    expect(rowNames()).toEqual(["C-05"]);
    // « N/A » (non attribué) n'est pas une personne
    await search("n/a");
    expect(screen.getByText("Aucun résultat.")).toBeInTheDocument();
    expect(screen.getByTestId("territory-count")).toHaveTextContent(
      "0 territoire sur 6"
    );
  });

  it("n'affiche sur la carte que les territoires trouvés, puis tous une fois la recherche effacée", async () => {
    await renderPage();
    const map = () => screen.getByTestId("territory-map");
    expect(map()).toHaveAttribute("data-fit", "false");

    await search("r12");
    // Ordre des données : celui du tableau n'importe pas à la carte (et ne la redessine pas)
    expect(map()).toHaveAttribute("data-names", "R-120,R-12");
    expect(map()).toHaveAttribute("data-fit", "true");

    await userEvent.click(
      screen.getByRole("button", { name: "Effacer la recherche" })
    );
    expect(searchBox()).toHaveValue("");
    expect(rowNames()).toHaveLength(6);
    expect(map().getAttribute("data-names")!.split(",")).toHaveLength(6);
    expect(map()).toHaveAttribute("data-fit", "false");
  });

  it("efface la recherche avec Échap", async () => {
    await renderPage();

    await search("r12");
    await userEvent.keyboard("{Escape}");

    expect(searchBox()).toHaveValue("");
    expect(rowNames()).toHaveLength(6);
  });

  it("combine la recherche et les filtres du tableau", async () => {
    await renderPage();

    await search("12");
    await userEvent.click(screen.getByRole("button", { name: /Ville/ }));
    fireEvent.change(
      within(await screen.findByRole("menu")).getByRole("combobox"),
      { target: { value: "Vannes" } }
    );
    await userEvent.keyboard("{Escape}");

    expect(rowNames()).toEqual(["V-112"]);
    // Réinitialiser les filtres garde la recherche, qui a son propre bouton
    await userEvent.click(screen.getByText("Réinitialiser les filtres"));
    expect(rowNames()).toEqual(["R-12", "R-120", "V-112", "C-05"]);
  });

  it("retrouve la recherche en revenant sur la page pendant la session", async () => {
    const { unmount } = await renderPage();
    await search("r12");
    expect(sessionStorage.getItem("tableSearch-territories")).toBe("r12");
    unmount();

    await renderPage();
    expect(searchBox()).toHaveValue("r12");
    expect(rowNames()).toEqual(["R-12", "R-120"]);

    await search("");
    expect(sessionStorage.getItem("tableSearch-territories")).toBeNull();
  });

  it("revient à la première page quand la recherche change", async () => {
    const many = {
      type: "FeatureCollection",
      features: Array.from({ length: 15 }, (_, i) =>
        props(`m${i}`, `R-${i + 1}`, "AVAILABLE")
      ),
    };
    mockApi({
      "GET /api/territoires/geojson": many,
      "GET /api/personnes": [],
    });
    renderWithStore(<TerritoryPage />);
    await screen.findByText("R-1");
    await userEvent.click(
      screen.getByRole("button", { name: "Page suivante" })
    );
    expect(screen.getByText("Page 2 sur 2")).toBeInTheDocument();

    await search("r");

    expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();
  });
});

describe("Recherche par adresse", () => {
  // Carrés de 0,002° côte à côte (environ 150 m de large), séparés d'environ 15 m
  const square = (
    id: string,
    name: string,
    lng: number,
    extra: Record<string, unknown> = {}
  ) => ({
    ...props(id, name, "ASSIGNED", { assignedTo: "Jean Dupont", ...extra }),
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lng, 48.7],
          [lng + 0.002, 48.7],
          [lng + 0.002, 48.702],
          [lng, 48.702],
          [lng, 48.7],
        ],
      ],
    },
  });
  const located = {
    type: "FeatureCollection",
    features: [
      square("a1", "R-14", 2.36),
      square("a2", "R-15", 2.3622, {
        status: "AVAILABLE",
        assignedTo: "N/A",
      }),
      square("a3", "V-01", 2.4),
    ],
  };
  const geocoding = (...features: [string, number, number][]) =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        type: "FeatureCollection",
        features: features.map(([label, lng, lat]) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: { label },
        })),
      }),
    }) as Response;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    localStorage.clear();
    sessionStorage.clear();
  });

  const renderPage = async () => {
    mockApi({
      "GET /api/territoires/geojson": located,
      "GET /api/personnes": [],
    });
    renderWithStore(<TerritoryPage />);
    await screen.findByText("R-14");
    await userEvent.click(screen.getByRole("button", { name: "Adresse" }));
    return screen.getByRole("combobox", { name: "Rechercher une adresse" });
  };

  it("trouve le territoire d'une adresse, le montre sur la carte et dans le tableau", async () => {
    const geocode = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        geocoding(
          ["12 Rue Victor Hugo 91550 Paray-Vieille-Poste", 2.3619, 48.701],
          ["12 Rue Victor Hugo 91200 Athis-Mons", 2.39, 48.71]
        )
      );
    const input = await renderPage();
    expect(screen.getByRole("button", { name: "Adresse" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await userEvent.type(input, "12 rue victor hugo");
    await userEvent.click(
      await screen.findByRole("option", {
        name: "12 Rue Victor Hugo 91550 Paray-Vieille-Poste",
      })
    );

    // Recherche près des territoires
    const url = new URL(String(geocode.mock.calls.at(-1)![0]));
    expect(url.searchParams.get("q")).toBe("12 rue victor hugo");
    expect(url.searchParams.get("lat")).toMatch(/^48\.70/);

    const result = screen.getByTestId("address-result");
    expect(result).toHaveTextContent(
      "Dans le territoire R-14 Attribué Jean Dupont"
    );
    // R-15 est de l'autre côté de la rue
    expect(result).toHaveTextContent("Juste à côté : R-15 Disponible à 20 m");
    expect(within(result).getByRole("link", { name: "R-14" })).toHaveAttribute(
      "href",
      "/territoires/a1"
    );

    expect(rowNames()).toEqual(["R-14", "R-15"]);
    const map = screen.getByTestId("territory-map");
    expect(map).toHaveAttribute(
      "data-focus",
      "12 Rue Victor Hugo 91550 Paray-Vieille-Poste"
    );
    expect(map).toHaveAttribute("data-names", "R-14,R-15");
  });

  it("indique les territoires les plus proches d'une adresse qui n'est dans aucun", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geocoding(["3 Rue des Champs 91550 Paray-Vieille-Poste", 2.3655, 48.701])
    );
    const input = await renderPage();

    await userEvent.type(input, "3 rue des champs");
    await userEvent.click(
      await screen.findByRole("option", {
        name: "3 Rue des Champs 91550 Paray-Vieille-Poste",
      })
    );

    const result = screen.getByTestId("address-result");
    expect(result).toHaveTextContent(
      "Cette adresse n'est dans aucun territoire."
    );
    expect(result).toHaveTextContent("Le plus proche : R-15");
    expect(rowNames()).toEqual(["R-15", "R-14"]);
  });

  it("signale une adresse introuvable ou un service indisponible", async () => {
    const geocode = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(geocoding());
    const input = await renderPage();

    await userEvent.type(input, "zzzz");
    // En attendant la réponse du service
    expect(screen.getByText("Recherche de l'adresse…")).toBeInTheDocument();
    expect(
      await screen.findByText("Aucune adresse trouvée")
    ).toBeInTheDocument();

    geocode.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await userEvent.type(input, "z");
    expect(
      await screen.findByText(
        "Recherche d'adresse impossible : vérifiez votre réseau"
      )
    ).toBeInTheDocument();
  });

  it("revient à la recherche par nom en effaçant l'adresse", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geocoding([
        "12 Rue Victor Hugo 91550 Paray-Vieille-Poste",
        2.3619,
        48.701,
      ])
    );
    const input = await renderPage();
    await userEvent.type(input, "12 rue victor hugo");
    await userEvent.click(await screen.findByRole("option"));
    expect(rowNames()).toEqual(["R-14", "R-15"]);

    await userEvent.click(
      screen.getByRole("button", { name: "Nom, ville, personne" })
    );

    expect(rowNames()).toHaveLength(3);
    expect(screen.getByTestId("territory-map")).toHaveAttribute(
      "data-focus",
      ""
    );
    expect(
      screen.getByRole("searchbox", { name: "Rechercher un territoire" })
    ).toBeInTheDocument();
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
