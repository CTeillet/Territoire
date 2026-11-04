import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  openQuickSearch,
  QuickSearch,
  QuickSearchButton,
} from "@/components/quick-search";
import { mockApi, renderWithStore } from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const feature = (
  id: string,
  name: string,
  status: string,
  assignedTo = "N/A"
) => ({
  type: "Feature",
  geometry: null,
  properties: { id, name, status, city: "Rennes", assignedTo },
});

const territories = {
  type: "FeatureCollection",
  features: [
    feature("t1", "R-120", "AVAILABLE"),
    feature("t2", "R-12", "ASSIGNED", "Jean Dupont"),
    feature("t3", "V-01", "LATE"),
  ],
};
const persons = [
  { id: "p1", firstName: "Jean", lastName: "Dupont" },
  { id: "p2", firstName: "Élodie", lastName: "Martin" },
];

const dialog = () => screen.getByRole("dialog");
const searchBox = () =>
  within(dialog()).getByRole("combobox", { name: "Recherche rapide" });

describe("Recherche rapide", () => {
  let api: ReturnType<typeof mockApi>;

  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockClear();
    api = mockApi({
      "GET /api/territoires/geojson": territories,
      "GET /api/personnes": persons,
    });
  });

  it("s'ouvre avec Ctrl+K, charge les territoires et les personnes, et mène au territoire choisi", async () => {
    renderWithStore(<QuickSearch />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.keyboard("{Control>}k{/Control}");

    expect(dialog()).toBeInTheDocument();
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/api/territoires/geojson")
    );
    expect(api).toHaveBeenCalledWith("/api/personnes");

    await userEvent.type(searchBox(), "r12");
    const options = await within(dialog()).findAllByRole("option");
    // R-12, identique à la recherche, avant R-120
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringMatching(/^R-12Rennes · Jean DupontAttribué$/),
      expect.stringMatching(/^R-120Rennes/),
    ]);

    await userEvent.keyboard("{Enter}");

    expect(push).toHaveBeenCalledWith("/territoires/t2");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("trouve une personne sans tenir compte des accents ni de l'ordre des mots", async () => {
    renderWithStore(<QuickSearch />);
    act(() => openQuickSearch());

    await userEvent.type(searchBox(), "martin elodie");
    await userEvent.click(
      await within(dialog()).findByRole("option", { name: "Élodie Martin" })
    );

    expect(push).toHaveBeenCalledWith("/personnes/p2");
  });

  it("propose les rubriques de l'application, sans les demandes pour un simple utilisateur", async () => {
    renderWithStore(<QuickSearch />, "UTILISATEUR");
    act(() => openQuickSearch());

    await userEvent.type(searchBox(), "param");
    await userEvent.click(
      within(dialog()).getByRole("option", { name: "Paramètres" })
    );
    expect(push).toHaveBeenCalledWith("/parametres");

    act(() => openQuickSearch());
    await userEvent.type(searchBox(), "demandes");
    expect(within(dialog()).getByText("Aucun résultat")).toBeInTheDocument();
  });

  it("affiche les demandes à un gestionnaire, et toutes les rubriques sans recherche", async () => {
    renderWithStore(<QuickSearch />, "GESTIONNAIRE");
    act(() => openQuickSearch());

    expect(
      within(dialog()).getByRole("option", { name: "Demandes" })
    ).toBeInTheDocument();
    expect(
      within(dialog()).getByRole("option", { name: "Tableau de bord" })
    ).toBeInTheDocument();
  });

  it("ne recharge pas les listes déjà connues", async () => {
    renderWithStore(<QuickSearch />, "ADMIN", {
      territories: { territoriesGeojson: territories as never },
      persons: { persons: persons as never },
    });
    act(() => openQuickSearch());

    await userEvent.type(searchBox(), "v-01");
    expect(
      await within(dialog()).findByRole("option", { name: /V-01/ })
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("n'existe pas sans utilisateur connecté", async () => {
    renderWithStore(
      <>
        <QuickSearch />
        <QuickSearchButton />
      </>,
      null
    );

    await userEvent.keyboard("{Control>}k{/Control}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Recherche rapide" })
    ).not.toBeInTheDocument();
  });

  it("s'ouvre depuis le bouton de la barre du haut", async () => {
    renderWithStore(
      <>
        <QuickSearch />
        <QuickSearchButton />
      </>
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Recherche rapide" })
    );

    expect(dialog()).toBeInTheDocument();
  });
});
