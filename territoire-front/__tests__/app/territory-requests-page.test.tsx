import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TerritoryRequestsPage from "@/app/(app)/demandes/page";
import {
  AvailableTerritory,
  TerritoryRequest,
} from "@/models/territory-request";
import { TerritoryType } from "@/models/territory-type";
import { TERRITORY_REQUESTS_CHANGED } from "@/lib/territory-request-api";
import { toast } from "sonner";
import { jsonResponse, mockApi, renderWithRole } from "../test-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const request = (
  overrides: Partial<TerritoryRequest> = {}
): TerritoryRequest => ({
  id: "d1",
  personId: "p1",
  personName: "Jean Dupont",
  cityId: "c1",
  cityName: "Rennes",
  comment: "Plutôt près de la gare",
  status: "EN_ATTENTE",
  createdAt: "2026-10-12T08:30:00Z",
  closedAt: null,
  territoryId: null,
  territoryName: null,
  activeTerritories: 1,
  ...overrides,
});

const available: AvailableTerritory[] = [
  {
    id: "t2",
    name: "R-2",
    type: TerritoryType.HOUSE,
    cityName: "Rennes",
    lastReturnDate: null,
  },
  {
    id: "t1",
    name: "R-1",
    type: TerritoryType.BUILDING,
    cityName: "Rennes",
    lastReturnDate: "2025-10-12",
  },
];

describe("Page des demandes de territoire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("liste les demandes en attente avec la ville, le commentaire et les territoires en cours", async () => {
    mockApi({
      "GET /api/demandes-territoire": [
        request(),
        request({
          id: "d2",
          personId: "p2",
          personName: "Paul Martin",
          cityId: null,
          cityName: null,
          comment: null,
          activeTerritories: 0,
        }),
      ],
    });

    renderWithRole(<TerritoryRequestsPage />, "GESTIONNAIRE");

    expect(await screen.findByText("Jean Dupont")).toHaveAttribute(
      "href",
      "/personnes/p1"
    );
    expect(screen.getByText("Rennes")).toBeInTheDocument();
    expect(screen.getByText("Plutôt près de la gare")).toBeInTheDocument();
    expect(screen.getByText("Peu importe")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Attribuer" })).toHaveLength(
      2
    );
  });

  it("indique l'absence de demande en attente", async () => {
    mockApi({ "GET /api/demandes-territoire": [] });

    renderWithRole(<TerritoryRequestsPage />, "ADMIN");

    expect(
      await screen.findByText("Aucune demande en attente")
    ).toBeInTheDocument();
  });

  it("attribue le territoire choisi (le moins récemment parcouru est présélectionné)", async () => {
    let requests = [request()];
    const assign = vi.fn(() => {
      requests = [];
      return { id: "a1" };
    });
    const api = mockApi({
      "GET /api/demandes-territoire/d1/territoires-disponibles": available,
      "GET /api/demandes-territoire": () => requests,
      "POST /api/territoires/t1/attribuer/p1": assign,
    });
    const changed = vi.fn();
    window.addEventListener(TERRITORY_REQUESTS_CHANGED, changed);

    renderWithRole(<TerritoryRequestsPage />, "ADMIN");
    await userEvent.click(
      await screen.findByRole("button", { name: "Attribuer" })
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Attribuer un territoire à Jean Dupont")
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Territoires disponibles à Rennes/)
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Plutôt près de la gare")
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Pavillon · jamais parcouru")
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Immeuble · parcouru le 12 oct\. 2025/)
    ).toBeInTheDocument();
    const radios = within(dialog).getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("data-state", "checked");

    await userEvent.click(radios[1]);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Attribuer" })
    );

    expect(assign).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("R-1 attribué à Jean Dupont");
    expect(
      await screen.findByText("Aucune demande en attente")
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(changed).toHaveBeenCalled();
    expect(api).toHaveBeenCalledWith("/api/territoires/t1/attribuer/p1", {
      method: "POST",
    });
    window.removeEventListener(TERRITORY_REQUESTS_CHANGED, changed);
  });

  it("propose tous les territoires quand la personne n'a pas de préférence", async () => {
    mockApi({
      "GET /api/demandes-territoire/d1/territoires-disponibles": [
        { ...available[0], cityName: "Brest" },
      ],
      "GET /api/demandes-territoire": [
        request({ cityId: null, cityName: null }),
      ],
    });

    renderWithRole(<TerritoryRequestsPage />, "ADMIN");
    await userEvent.click(
      await screen.findByRole("button", { name: "Attribuer" })
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/pas de préférence de ville/)
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Brest · Pavillon · jamais parcouru")
    ).toBeInTheDocument();
  });

  it("indique qu'aucun territoire n'est disponible", async () => {
    mockApi({
      "GET /api/demandes-territoire/d1/territoires-disponibles": [],
      "GET /api/demandes-territoire": [request()],
    });

    renderWithRole(<TerritoryRequestsPage />, "ADMIN");
    await userEvent.click(
      await screen.findByRole("button", { name: "Attribuer" })
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText(
        "Aucun territoire disponible à Rennes pour le moment."
      )
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Attribuer" })
    ).toBeDisabled();
  });

  it("signale un échec d'attribution", async () => {
    mockApi({
      "GET /api/demandes-territoire/d1/territoires-disponibles": available,
      "GET /api/demandes-territoire": [request()],
      "POST /api/territoires/t2/attribuer/p1": jsonResponse(
        { error: "Ce territoire vient d'être modifié" },
        409
      ),
    });

    renderWithRole(<TerritoryRequestsPage />, "ADMIN");
    await userEvent.click(
      await screen.findByRole("button", { name: "Attribuer" })
    );
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getAllByRole("radio")).toHaveLength(2)
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Attribuer" })
    );

    expect(toast.error).toHaveBeenCalledWith(
      "Ce territoire vient d'être modifié"
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clôture une demande après confirmation", async () => {
    let requests = [request()];
    mockApi({
      "GET /api/demandes-territoire": () => requests,
      "POST /api/demandes-territoire/d1/cloture": () => {
        requests = [];
        return request({ status: "CLOTUREE" });
      },
    });

    renderWithRole(<TerritoryRequestsPage />, "SUPERVISEUR");
    await userEvent.click(
      await screen.findByRole("button", { name: "Clôturer" })
    );
    expect(
      screen.getByText("Clôturer la demande de Jean Dupont ?")
    ).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Clôturer",
      })
    );

    expect(toast.success).toHaveBeenCalledWith(
      "Demande de Jean Dupont clôturée"
    );
    expect(
      await screen.findByText("Aucune demande en attente")
    ).toBeInTheDocument();
  });

  it("affiche l'historique avec le territoire attribué", async () => {
    const api = mockApi({
      "GET /api/demandes-territoire": [
        request({
          status: "ATTRIBUEE",
          territoryId: "t2",
          territoryName: "R-2",
          closedAt: "2026-10-12T09:00:00Z",
        }),
        request({
          id: "d3",
          status: "ANNULEE",
          closedAt: "2026-10-11T09:00:00Z",
        }),
      ],
    });

    renderWithRole(<TerritoryRequestsPage />, "ADMIN");
    await userEvent.click(
      await screen.findByLabelText("Afficher les demandes traitées")
    );

    expect(api).toHaveBeenLastCalledWith(
      "/api/demandes-territoire?historique=true",
      {}
    );
    expect(await screen.findByText("Attribuée")).toBeInTheDocument();
    expect(screen.getByText("R-2")).toHaveAttribute("href", "/territoires/t2");
    expect(screen.getByText("Annulée par la personne")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Attribuer" })
    ).not.toBeInTheDocument();
  });

  it("signale une erreur de chargement", async () => {
    mockApi({
      "GET /api/demandes-territoire": jsonResponse(
        { error: "Erreur interne" },
        500
      ),
    });

    renderWithRole(<TerritoryRequestsPage />, "ADMIN");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erreur interne")
    );
  });

  it("est réservée aux responsables", async () => {
    const api = mockApi({});

    renderWithRole(<TerritoryRequestsPage />, "UTILISATEUR");

    expect(
      screen.getByText(
        "Les demandes de territoire sont réservées aux responsables."
      )
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("renvoie vers la connexion sans session", () => {
    mockApi({});

    renderWithRole(<TerritoryRequestsPage />, null);

    expect(push).toHaveBeenCalledWith("/login");
  });
});
