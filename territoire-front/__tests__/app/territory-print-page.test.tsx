import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import TerritoryPrintPage from "@/app/(app)/territoires/impression/page";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const feature = (
  id: string,
  name: string,
  city: string,
  territoryMapId?: string,
  lost = false
) => ({
  type: "Feature",
  geometry: null,
  properties: { id, name, status: "AVAILABLE", city, territoryMapId, lost },
});

const collection = {
  type: "FeatureCollection",
  features: [
    feature("t1", "PVP10", "Paray Vieille Poste", "t1"),
    feature("t2", "PVP2", "Paray Vieille Poste", "t2"),
    feature("t3", "M106", "Morangis", "t3"),
    feature("t4", "C1", "Commerces"),
    feature("t5", "M2", "Morangis", "t5"),
  ],
};

// PVP10 et M106 perdus ; C1, perdu lui aussi, n'a pas de carte à imprimer
const collectionWithLost = {
  type: "FeatureCollection",
  features: [
    feature("t1", "PVP10", "Paray Vieille Poste", "t1", true),
    feature("t2", "PVP2", "Paray Vieille Poste", "t2"),
    feature("t3", "M106", "Morangis", "t3", true),
    feature("t4", "C1", "Commerces", undefined, true),
    feature("t5", "M2", "Morangis", "t5"),
  ],
};

const printButton = () => screen.getByRole("button", { name: /Imprimer/ });
const lostSuggestions = () =>
  screen.queryByRole("region", { name: "Territoires perdus" });

describe("Impression des cartes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    URL.createObjectURL = vi.fn(() => "blob:carte");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 1600;
        naturalHeight = 1100;
        onload: (() => void) | null = null;
        set src(url: string) {
          if (url) setTimeout(() => this.onload?.());
        }
      }
    );
    // Pas de canvas dans jsdom : la carte est imprimée entière, sans découpe
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sélectionne les territoires, compose les feuilles de 4 cartes et imprime", async () => {
    const api = mockApi({
      "GET /api/territoires/geojson": collection,
      "GET /api/territoires/": jsonResponse({}),
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderWithStore(<TerritoryPrintPage />, "UTILISATEUR");

    // Par ville puis dans l'ordre naturel des noms ; un territoire sans carte ne peut pas être choisi
    const checkboxes = await screen.findAllByRole("checkbox");
    expect(checkboxes.map((c) => c.getAttribute("aria-label"))).toEqual([
      "C1, Commerces",
      "M2, Morangis",
      "M106, Morangis",
      "PVP2, Paray Vieille Poste",
      "PVP10, Paray Vieille Poste",
    ]);
    expect(
      screen.getByRole("checkbox", { name: "C1, Commerces" })
    ).toBeDisabled();
    expect(screen.getByText("sans carte")).toBeInTheDocument();
    expect(printButton()).toBeDisabled();
    // Aucun territoire perdu : rien à proposer
    expect(lostSuggestions()).not.toBeInTheDocument();

    // « Tout sélectionner » ne prend que les territoires affichés
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Ville" }),
      "Morangis"
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Tout sélectionner" })
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Ville" }),
      ""
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Rechercher un territoire" }),
      "pvp1"
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    await userEvent.click(
      screen.getByRole("checkbox", { name: "PVP10, Paray Vieille Poste" })
    );

    expect(
      screen.getByText("3 territoires sélectionnés · 1 feuille A4")
    ).toBeInTheDocument();
    await waitFor(() => expect(printButton()).toBeEnabled());
    expect(api).toHaveBeenCalledWith("/api/territoires/t5/carte");
    expect(api).not.toHaveBeenCalledWith("/api/territoires/t2/carte");

    // Aperçu à l'écran et copie pour l'impression, rendue directement dans <body>
    const sheets = screen.getAllByRole("region", { name: "Feuille 1" });
    expect(sheets).toHaveLength(2);
    expect(sheets[1].parentElement).toHaveClass("territory-print");
    expect(sheets[1].parentElement!.parentElement).toBe(document.body);
    expect(
      within(sheets[0])
        .getAllByRole("img")
        .map((img) => img.getAttribute("alt"))
    ).toEqual(["Carte M2", "Carte M106", "Carte PVP10"]);
    expect(
      within(sheets[0]).getByRole("img", { name: "Carte M2" })
    ).toHaveAttribute("src", "blob:carte");

    await userEvent.click(printButton());
    expect(print).toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "Tout désélectionner" })
    );
    expect(
      screen.getByText("0 territoire sélectionné · 0 feuille A4")
    ).toBeInTheDocument();
    expect(document.querySelector(".territory-print")).toBeNull();
  });

  it("propose les territoires perdus puis les retire des perdus une fois imprimés", async () => {
    const api = mockApi({
      "GET /api/territoires/geojson": collectionWithLost,
      "GET /api/territoires/": jsonResponse({}),
      "PUT /api/territoires/": jsonResponse({}),
    });
    renderWithStore(<TerritoryPrintPage />, "GESTIONNAIRE");

    const suggestions = await screen.findByRole("region", {
      name: "Territoires perdus",
    });
    expect(
      within(suggestions).getByRole("heading", {
        name: "3 territoires perdus à réimprimer",
      })
    ).toBeInTheDocument();
    expect(
      within(suggestions).getByText("C1 (sans carte), M106, PVP10")
    ).toBeInTheDocument();
    expect(screen.getAllByText("perdu")).toHaveLength(3);

    // Seuls les perdus qui ont une carte sont sélectionnés
    const selectLost = within(suggestions).getByRole("button", {
      name: "Sélectionner les territoires perdus",
    });
    await userEvent.click(selectLost);
    expect(
      screen.getByText("2 territoires sélectionnés · 1 feuille A4")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "M106, Morangis" })
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "PVP10, Paray Vieille Poste" })
    ).toBeChecked();
    expect(selectLost).toBeDisabled();

    expect(
      screen.getByText(
        "2 territoires perdus sélectionnés : une fois leurs cartes imprimées, retirez-les des perdus."
      )
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Retirer des perdus" })
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "2 territoires retirés des perdus."
      )
    );
    for (const id of ["t1", "t3"]) {
      expect(api).toHaveBeenCalledWith("/api/territoires/" + id + "/perdu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lost: false }),
      });
    }
    // Reste C1, sans carte à imprimer ; la sélection ne change pas
    expect(
      within(lostSuggestions()!).getByRole("heading", {
        name: "1 territoire perdu à réimprimer",
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("perdu")).toHaveLength(1);
    expect(
      screen.getByText("2 territoires sélectionnés · 1 feuille A4")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retirer des perdus" })
    ).not.toBeInTheDocument();
  });

  it("signale les territoires qui n'ont pas pu être retirés des perdus", async () => {
    mockApi({
      "GET /api/territoires/geojson": collectionWithLost,
      "GET /api/territoires/": jsonResponse({}),
      "PUT /api/territoires/t1/perdu": jsonResponse({}),
      "PUT /api/territoires/t3/perdu": jsonResponse({ error: "Refusé" }, 500),
    });
    renderWithStore(<TerritoryPrintPage />, "GESTIONNAIRE");

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Sélectionner les territoires perdus",
      })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Retirer des perdus" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Un territoire n'a pas pu être retiré des perdus."
      )
    );
    expect(toast.success).toHaveBeenCalledWith("Territoire retiré des perdus.");
    expect(
      screen.getByText(
        "M106 est perdu : une fois sa carte imprimée, retirez-le des perdus."
      )
    ).toBeInTheDocument();
  });

  it("ne permet pas à un simple utilisateur de retirer des perdus", async () => {
    mockApi({
      "GET /api/territoires/geojson": collectionWithLost,
      "GET /api/territoires/": jsonResponse({}),
    });
    renderWithStore(<TerritoryPrintPage />, "UTILISATEUR");

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Sélectionner les territoires perdus",
      })
    );

    expect(
      screen.getByText("2 territoires sélectionnés · 1 feuille A4")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retirer des perdus" })
    ).not.toBeInTheDocument();
  });

  it("signale une carte qui n'a pas pu être chargée", async () => {
    mockApi({
      "GET /api/territoires/geojson": collection,
      "GET /api/territoires/": jsonResponse({}, 404),
    });
    renderWithStore(<TerritoryPrintPage />);

    await userEvent.click(
      await screen.findByRole("checkbox", { name: "M106, Morangis" })
    );

    expect(
      await screen.findByText("1 carte n'a pas pu être chargée.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Carte indisponible")).toHaveLength(2);
    expect(printButton()).toBeEnabled();
  });

  it("renvoie vers la connexion sans session", async () => {
    const api = mockApi({});
    renderWithStore(<TerritoryPrintPage />, null);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(api).not.toHaveBeenCalled();
  });
});
