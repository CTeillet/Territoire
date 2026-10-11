import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CampaignDetailPage from "@/app/(app)/campagnes/[id]/page";
import { toast } from "sonner";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: "c1" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// Carte et statistiques : testées à part
vi.mock("@/components/campaigns/campaign-map", () => ({
  default: ({ remainingTerritoryIds }: { remainingTerritoryIds: string[] }) => (
    <div data-testid="campaign-map">{remainingTerritoryIds.join(",")}</div>
  ),
}));
vi.mock("@/components/campaigns/campaign-statistics", () => ({
  CampaignStatisticsComponent: () => <div>statistiques de campagne</div>,
}));

const territory = (
  territoryId: string,
  name: string,
  cityName: string,
  type: "HOUSE" | "BUILDING" | null = "HOUSE"
) => ({
  territoryId,
  name,
  cityName,
  cityId: cityName,
  status: "AVAILABLE",
  type,
});

const campaign = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "Campagne d'automne",
  description: "Invitations",
  startDate: "2026-09-01",
  endDate: "2026-10-31",
  closed: false,
  territories: [
    territory("t1", "R-12", "Rennes"),
    territory("t2", "R-02", "Rennes", null),
    territory("t3", "C-01", "Cesson", "BUILDING"),
  ],
  remainingTerritories: [territory("t1", "R-12", "Rennes")],
  ...overrides,
});

describe("Page détail d'une campagne", () => {
  let api: ReturnType<typeof mockApi>;

  const setup = (
    data: unknown = campaign(),
    extra: Record<string, unknown> = {}
  ) => {
    api = mockApi({
      "GET /api/campagnes/c1": data,
      "PUT /api/campagnes/c1/territoires-restants": (init?: RequestInit) =>
        campaign({ remainingTerritories: JSON.parse(String(init?.body)) }),
      "PUT /api/campagnes/c1/fermer": campaign({ closed: true }),
      "DELETE /api/campagnes/c1": null,
      ...extra,
    });
  };

  const checkboxOf = (name: string) =>
    screen
      .getByText(name)
      .closest("tr")!
      .querySelector("button[role=checkbox]")!;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    push.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("affiche la campagne, ses territoires par ville et présélectionne les restants", async () => {
    setup();
    renderWithStore(<CampaignDetailPage />);

    expect(await screen.findByText("Campagne d'automne")).toBeInTheDocument();
    expect(screen.getByText("Invitations")).toBeInTheDocument();
    expect(screen.getByText(/Début: 01 septembre 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Fin: 31 octobre 2026/)).toBeInTheDocument();
    const cities = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(cities).toEqual(["Cesson", "Rennes"]);
    expect(checkboxOf("R-12")).toHaveAttribute("data-state", "checked");
    expect(checkboxOf("R-02")).toHaveAttribute("data-state", "unchecked");
    expect(screen.getByText("Immeuble")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("enregistre les territoires restants cochés", async () => {
    setup();
    renderWithStore(<CampaignDetailPage />);

    await screen.findByText("R-02");
    await userEvent.click(checkboxOf("R-02"));
    await userEvent.click(checkboxOf("R-12"));
    await userEvent.click(
      screen.getByText("Enregistrer les territoires restants")
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "La liste des territoires restants a été mise à jour avec succès."
      )
    );
    const put = api.mock.calls.find(
      ([url]) => url === "/api/campagnes/c1/territoires-restants"
    )!;
    expect(
      JSON.parse(String(put[1]?.body)).map(
        (t: { territoryId: string }) => t.territoryId
      )
    ).toEqual(["t2"]);
  });

  it("sélectionne puis désélectionne toute une ville", async () => {
    setup();
    renderWithStore(<CampaignDetailPage />);

    const rennes = (await screen.findByRole("heading", { name: "Rennes" }))
      .parentElement!;
    await userEvent.click(within(rennes).getByText("Tout sélectionner"));
    expect(checkboxOf("R-02")).toHaveAttribute("data-state", "checked");
    expect(checkboxOf("C-01")).toHaveAttribute("data-state", "unchecked");

    await userEvent.click(within(rennes).getByText("Tout désélectionner"));
    expect(checkboxOf("R-12")).toHaveAttribute("data-state", "unchecked");
    expect(checkboxOf("R-02")).toHaveAttribute("data-state", "unchecked");
  });

  it("signale l'échec de l'enregistrement", async () => {
    setup(campaign(), {
      "PUT /api/campagnes/c1/territoires-restants": jsonResponse({}, 500),
    });
    renderWithStore(<CampaignDetailPage />);

    await userEvent.click(
      await screen.findByText("Enregistrer les territoires restants")
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Une erreur est survenue lors de la mise à jour des territoires restants"
      )
    );
  });

  it("clôture la campagne après avoir enregistré les territoires restants", async () => {
    setup();
    renderWithStore(<CampaignDetailPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Clôturer la campagne" })
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Clôturer la campagne" })
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "La campagne a été clôturée avec succès et les assignations ont été créées."
      )
    );
    const urls = api.mock.calls.map(([url]) => url);
    expect(urls.indexOf("/api/campagnes/c1/territoires-restants")).toBeLessThan(
      urls.indexOf("/api/campagnes/c1/fermer")
    );
  });

  it("signale l'échec de la clôture", async () => {
    setup(campaign(), {
      "PUT /api/campagnes/c1/fermer": jsonResponse({}, 500),
    });
    renderWithStore(<CampaignDetailPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Clôturer la campagne" })
    );
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Clôturer la campagne",
      })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Une erreur est survenue lors de la clôture de la campagne"
      )
    );
  });

  it("annule la clôture et la suppression depuis les boîtes de dialogue", async () => {
    setup();
    renderWithStore(<CampaignDetailPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Clôturer la campagne" })
    );
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Annuler",
      })
    );
    await userEvent.click(screen.getByRole("button", { name: /Supprimer/ }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Annuler",
      })
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(api.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(
      false
    );
  });

  it("supprime la campagne puis revient à la liste", async () => {
    setup();
    renderWithStore(<CampaignDetailPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Supprimer/ })
    );
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Supprimer la campagne",
      })
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith("/campagnes"));
    expect(toast.success).toHaveBeenCalledWith(
      "La campagne a été supprimée avec succès."
    );
  });

  it("signale l'échec de la suppression", async () => {
    setup(campaign(), { "DELETE /api/campagnes/c1": jsonResponse({}, 409) });
    renderWithStore(<CampaignDetailPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Supprimer/ })
    );
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Supprimer la campagne",
      })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Une erreur est survenue lors de la suppression de la campagne"
      )
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("affiche l'usage des territoires d'une campagne clôturée, sans actions", async () => {
    setup(campaign({ closed: true, endDate: null }));
    renderWithStore(<CampaignDetailPage />);

    expect(
      await screen.findByText(
        "Liste des territoires qui ont été utilisés pendant cette campagne"
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("Utilisé")).toHaveLength(2);
    expect(screen.getAllByText("Non utilisé")).toHaveLength(1);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Enregistrer les territoires restants")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clôturer la campagne" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Fin:/)).not.toBeInTheDocument();
  });

  it("un gestionnaire peut faire avancer la campagne mais pas la clôturer ni la supprimer", async () => {
    setup();
    renderWithStore(<CampaignDetailPage />, "GESTIONNAIRE");

    expect(
      await screen.findByText("Enregistrer les territoires restants")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clôturer la campagne" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Supprimer/ })
    ).not.toBeInTheDocument();
  });

  it("un simple utilisateur consulte sans pouvoir modifier", async () => {
    setup(campaign({ description: "" }));
    renderWithStore(<CampaignDetailPage />, "UTILISATEUR");

    expect(await screen.findByText("Aucune description")).toBeInTheDocument();
    expect(checkboxOf("R-12")).toBeDisabled();
    expect(screen.queryByText("Tout sélectionner")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Enregistrer les territoires restants")
    ).not.toBeInTheDocument();
  });

  it("indique une campagne sans territoire", async () => {
    setup(campaign({ territories: [], remainingTerritories: [] }));
    renderWithStore(<CampaignDetailPage />);

    expect(
      await screen.findByText("Aucun territoire dans cette campagne")
    ).toBeInTheDocument();
  });

  it("indique une campagne introuvable", async () => {
    setup(jsonResponse({}, 404));
    renderWithStore(<CampaignDetailPage />);

    expect(await screen.findByText("Campagne non trouvée")).toBeInTheDocument();
  });

  it("transmet à la carte la sélection en cours et ouvre les statistiques", async () => {
    setup();
    renderWithStore(<CampaignDetailPage />);

    await screen.findByText("R-02");
    await userEvent.click(checkboxOf("R-02"));
    await userEvent.click(screen.getByRole("tab", { name: "Vue Carte" }));
    expect(screen.getByTestId("campaign-map")).toHaveTextContent("t1,t2");

    await userEvent.click(screen.getByRole("tab", { name: "Statistiques" }));
    expect(screen.getByText("statistiques de campagne")).toBeInTheDocument();
  });

  it("revient à la liste des campagnes", async () => {
    setup();
    renderWithStore(<CampaignDetailPage />);

    await userEvent.click(await screen.findByText("Retour aux campagnes"));

    expect(push).toHaveBeenCalledWith("/campagnes");
  });
});
