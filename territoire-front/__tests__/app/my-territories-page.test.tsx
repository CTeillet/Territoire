import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyTerritoriesPage from "@/app/m/[token]/page";
import {
  PublicAccess,
  PublicTerritory,
  PublicTerritoryRequest,
} from "@/models/person-access";
import { toast } from "sonner";
import { jsonResponse } from "../test-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "jeton/secret" }),
}));
// La carte (Leaflet) est testée à part : ici un simple marqueur
vi.mock("next/dynamic", () => ({
  default: () =>
    function MockMap({ geojson }: { geojson: string }) {
      return <div data-testid="map">{geojson}</div>;
    },
}));

const territory = (
  overrides: Partial<PublicTerritory> = {}
): PublicTerritory => ({
  id: "t1",
  name: "R-12",
  cityName: "Rennes",
  type: "HOUSE",
  note: "Commencer par la rue des Lilas",
  assignmentDate: "2026-06-01",
  dueDate: "2026-10-01",
  late: true,
  geojson: '{"type":"FeatureCollection","features":[]}',
  addressesNotToDo: [
    { number: "12", street: "rue des Lilas", zipCode: "35000", city: "Rennes" },
  ],
  ...overrides,
});

const view = (
  territories: PublicTerritory[],
  pendingRequest: PublicTerritoryRequest | null = null
): PublicAccess => ({
  firstName: "Jean",
  territories,
  cities: [
    { id: "c-brest", name: "Brest" },
    { id: "c-rennes", name: "Rennes" },
  ],
  pendingRequest,
});

const pending: PublicTerritoryRequest = {
  id: "d1",
  cityName: "Rennes",
  comment: "Plutôt près de la gare",
  createdAt: "2026-10-12T08:30:00Z",
};

describe("Page « mes territoires »", () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn<typeof fetch>();
    global.fetch = fetchMock;
  });

  it("affiche les territoires en cours avec carte, note, échéance et adresses", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        view([
          territory(),
          territory({
            id: "t2",
            name: "R-27",
            late: false,
            note: null,
            dueDate: "2027-01-20",
            addressesNotToDo: [],
          }),
        ])
      )
    );

    render(<MyTerritoriesPage />);

    expect(await screen.findByText("Bonjour Jean")).toBeInTheDocument();
    expect(
      screen.getByText("Tu as 2 territoires en cours.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("En retard")).toHaveLength(1);
    expect(
      screen.getByText("Commencer par la rue des Lilas")
    ).toBeInTheDocument();
    expect(
      screen.getByText("12 rue des Lilas, 35000 Rennes")
    ).toBeInTheDocument();
    expect(screen.getByText("Aucune adresse signalée.")).toBeInTheDocument();
    expect(
      screen.getByText(/À rendre avant le 1 octobre 2026/)
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("map")).toHaveLength(2);
    // Le jeton est encodé dans l'URL et la réponse n'est jamais mise en cache
    expect(fetchMock).toHaveBeenCalledWith("/api/public/acces/jeton%2Fsecret", {
      cache: "no-store",
    });
  });

  it("indique quand aucun territoire n'est en cours", async () => {
    fetchMock.mockResolvedValue(jsonResponse(view([])));

    render(<MyTerritoriesPage />);

    expect(
      await screen.findByText("Tu n'as aucun territoire en cours.")
    ).toBeInTheDocument();
  });

  it("utilise le singulier pour un seul territoire", async () => {
    fetchMock.mockResolvedValue(jsonResponse(view([territory()])));

    render(<MyTerritoriesPage />);

    expect(
      await screen.findByText("Tu as 1 territoire en cours.")
    ).toBeInTheDocument();
  });

  it("affiche le message de l'API pour un lien invalide", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Ce lien n'est pas ou plus valide." }, 404)
    );

    render(<MyTerritoriesPage />);

    expect(
      await screen.findByText("Ce lien n'est pas ou plus valide.")
    ).toBeInTheDocument();
  });

  it.each([
    [
      404,
      "Ce lien n'est pas ou plus valide. Demandez un nouveau lien à votre responsable.",
    ],
    [429, "Trop de tentatives. Réessayez dans quelques minutes."],
    [502, "Le service est momentanément indisponible. Réessayez plus tard."],
  ])(
    "affiche un message par défaut pour le statut %i",
    async (status, message) => {
      fetchMock.mockResolvedValue({
        ok: false,
        status,
        json: async () => null,
      } as unknown as Response);

      render(<MyTerritoriesPage />);

      expect(await screen.findByText(message)).toBeInTheDocument();
    }
  );

  it("signale l'absence de réseau", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<MyTerritoriesPage />);

    expect(
      await screen.findByText("Pas de connexion réseau. Réessayez plus tard.")
    ).toBeInTheDocument();
  });

  it("rend un territoire après confirmation", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(view([territory()])))
      .mockResolvedValueOnce(jsonResponse(view([])));

    render(<MyTerritoriesPage />);

    await userEvent.click(await screen.findByText("Rendre ce territoire"));
    expect(screen.getByText("Rendre R-12 ?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Rendre" }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/public/acces/jeton%2Fsecret/territoires/t1/retour",
      {
        method: "POST",
        cache: "no-store",
      }
    );
    expect(
      await screen.findByText("Tu n'as aucun territoire en cours.")
    ).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      "Territoire R-12 rendu, merci !"
    );
  });

  it("signale un refus de retour", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(view([territory()])))
      .mockResolvedValueOnce(
        jsonResponse({ error: "Ce territoire ne vous est pas attribué" }, 404)
      );

    render(<MyTerritoriesPage />);

    await userEvent.click(await screen.findByText("Rendre ce territoire"));
    await userEvent.click(screen.getByRole("button", { name: "Rendre" }));

    expect(toast.error).toHaveBeenCalledWith(
      "Ce territoire ne vous est pas attribué"
    );
    expect(screen.getByText("R-12")).toBeInTheDocument();
  });

  it("signale un retour impossible faute de réseau", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(view([territory()])))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<MyTerritoriesPage />);

    await userEvent.click(await screen.findByText("Rendre ce territoire"));
    await userEvent.click(screen.getByRole("button", { name: "Rendre" }));

    expect(toast.error).toHaveBeenCalledWith(
      "Pas de connexion réseau : le territoire n'a pas été rendu."
    );
  });

  describe("demande de nouveau territoire", () => {
    it("envoie une demande avec la ville et le commentaire", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(view([territory()])))
        .mockResolvedValueOnce(jsonResponse(view([territory()], pending)));

      render(<MyTerritoriesPage />);

      expect(
        await screen.findByText("Besoin d'un autre territoire ?")
      ).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole("button", { name: "Demander un territoire" })
      );
      const dialog = await screen.findByRole("dialog");
      await userEvent.click(within(dialog).getByRole("combobox"));
      await userEvent.click(
        await screen.findByRole("option", { name: "Rennes" })
      );
      await userEvent.type(
        within(dialog).getByLabelText("Commentaire (facultatif)"),
        "  Plutôt près de la gare "
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Envoyer la demande" })
      );

      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/public/acces/jeton%2Fsecret/demandes",
        {
          cache: "no-store",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cityId: "c-rennes",
            comment: "Plutôt près de la gare",
          }),
        }
      );
      expect(
        await screen.findByText("Demande de territoire envoyée")
      ).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith(
        "Demande envoyée à ton responsable, merci !"
      );
    });

    it("propose « peu importe » par défaut, sans commentaire", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(view([])))
        .mockResolvedValueOnce(
          jsonResponse(view([], { ...pending, cityName: null, comment: null }))
        );

      render(<MyTerritoriesPage />);

      expect(
        await screen.findByText("Besoin d'un territoire ?")
      ).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole("button", { name: "Demander un territoire" })
      );
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("combobox")).toHaveTextContent(
        "Peu importe"
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Envoyer la demande" })
      );

      const [, init] = fetchMock.mock.lastCall as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({
        cityId: null,
        comment: null,
      });
      expect(await screen.findByText("Peu importe")).toBeInTheDocument();
    });

    it("affiche le refus de l'API et garde le formulaire ouvert", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(view([])))
        .mockResolvedValueOnce(
          jsonResponse(
            { error: "Tu as déjà fait plusieurs demandes aujourd'hui" },
            409
          )
        );

      render(<MyTerritoriesPage />);

      await userEvent.click(
        await screen.findByRole("button", { name: "Demander un territoire" })
      );
      await userEvent.click(
        within(await screen.findByRole("dialog")).getByRole("button", {
          name: "Envoyer la demande",
        })
      );

      expect(toast.error).toHaveBeenCalledWith(
        "Tu as déjà fait plusieurs demandes aujourd'hui"
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("signale une demande impossible faute de réseau", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(view([])))
        .mockRejectedValueOnce(new TypeError("Failed to fetch"));

      render(<MyTerritoriesPage />);

      await userEvent.click(
        await screen.findByRole("button", { name: "Demander un territoire" })
      );
      await userEvent.click(
        within(await screen.findByRole("dialog")).getByRole("button", {
          name: "Envoyer la demande",
        })
      );

      expect(toast.error).toHaveBeenCalledWith(
        "Pas de connexion réseau : la demande n'a pas été envoyée."
      );
    });

    it("affiche la demande en attente et permet de l'annuler", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(view([], pending)))
        .mockResolvedValueOnce(jsonResponse(view([])));

      render(<MyTerritoriesPage />);

      expect(
        await screen.findByText("Demande de territoire envoyée")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Envoyée le 12 octobre 2026/)
      ).toBeInTheDocument();
      expect(screen.getByText("Rennes")).toBeInTheDocument();
      expect(screen.getByText("Plutôt près de la gare")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Demander un territoire" })
      ).not.toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "Annuler ma demande" })
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Annuler la demande" })
      );

      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/public/acces/jeton%2Fsecret/demandes/d1/annulation",
        { cache: "no-store", method: "POST" }
      );
      expect(
        await screen.findByRole("button", { name: "Demander un territoire" })
      ).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith("Demande annulée");
    });

    it("signale une annulation refusée", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(view([], pending)))
        .mockResolvedValueOnce(
          jsonResponse({ error: "Cette demande a déjà été traitée." }, 409)
        );

      render(<MyTerritoriesPage />);

      await userEvent.click(
        await screen.findByRole("button", { name: "Annuler ma demande" })
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Annuler la demande" })
      );

      expect(toast.error).toHaveBeenCalledWith(
        "Cette demande a déjà été traitée."
      );
    });
  });
});
