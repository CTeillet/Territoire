import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TerritoryPrintPage from "@/app/(app)/territoires/impression/page";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const feature = (
  id: string,
  name: string,
  city: string,
  territoryMapId?: string
) => ({
  type: "Feature",
  geometry: null,
  properties: { id, name, status: "AVAILABLE", city, territoryMapId },
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

const printButton = () => screen.getByRole("button", { name: /Imprimer/ });

describe("Impression des cartes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockClear();
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
