import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PersonsPage from "@/app/(app)/personnes/page";
import PersonDetail from "@/app/(app)/personnes/[id]/page";
import { toast } from "sonner";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: "p1" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const persons = [
  {
    id: "p1",
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@exemple.fr",
    phoneNumber: "0612345678",
  },
  { id: "p2", firstName: "Anne", lastName: "Martin" },
  { id: "p3", firstName: "Paul", lastName: "Durand" },
];

describe("Liste des personnes", () => {
  let api: ReturnType<typeof mockApi>;

  const setup = (extra: Record<string, unknown> = {}) => {
    api = mockApi({
      "GET /api/personnes": persons,
      "POST /api/personnes": (init?: RequestInit) => ({
        id: "p4",
        ...JSON.parse(String(init?.body)),
      }),
      "DELETE /api/personnes/p2": null,
      ...extra,
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    push.mockClear();
  });

  it("regroupe les personnes par initiale du nom et formate le téléphone", async () => {
    setup();
    renderWithStore(<PersonsPage />);

    expect(await screen.findByText("Jean Dupont")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .filter((h) => h.id)
        .map((h) => h.textContent)
    ).toEqual(["D", "M"]);
    expect(screen.getByText("06 12 34 56 78")).toBeInTheDocument();
    expect(screen.getByText("jean@exemple.fr")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir la fiche de Jean Dupont" })
    ).toHaveAttribute("href", "/personnes/p1");
  });

  it("filtre par nom, e-mail ou téléphone", async () => {
    setup();
    renderWithStore(<PersonsPage />);
    const search = await screen.findByPlaceholderText(
      "Rechercher une personne..."
    );

    await userEvent.type(search, "exemple");
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.queryByText("Anne Martin")).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "0612");
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "zzz");
    expect(
      screen.getByText("Aucune personne ne correspond à votre recherche.")
    ).toBeInTheDocument();
  });

  it("supprime une personne après confirmation", async () => {
    setup();
    renderWithStore(<PersonsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer Anne Martin" })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Supprimer",
      })
    );

    await waitFor(() =>
      expect(screen.queryByText("Anne Martin")).not.toBeInTheDocument()
    );
  });

  it("affiche le motif du refus de suppression", async () => {
    setup({
      "DELETE /api/personnes/p2": jsonResponse(
        { error: "Impossible : historique d'attributions" },
        409
      ),
    });
    renderWithStore(<PersonsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer Anne Martin" })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Supprimer",
      })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Impossible : historique d'attributions"
      )
    );
    expect(screen.getByText("Anne Martin")).toBeInTheDocument();
  });

  it("crée une personne", async () => {
    setup();
    renderWithStore(<PersonsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter une personne" })
    );
    await userEvent.type(screen.getByPlaceholderText("Prénom *"), " Lucie ");
    await userEvent.type(screen.getByPlaceholderText("Nom *"), "Bernard");
    await userEvent.type(
      screen.getByPlaceholderText("Email (optionnel)"),
      "lucie@exemple.fr"
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter la personne" })
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "La personne a bien été ajoutée !"
      )
    );
    const post = api.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(post[1]?.body))).toEqual({
      id: null,
      firstName: "Lucie",
      lastName: "Bernard",
      email: "lucie@exemple.fr",
    });
    expect(await screen.findByText("Lucie Bernard")).toBeInTheDocument();
  });

  it("signale l'échec de la création au lieu d'annoncer un succès", async () => {
    setup({ "POST /api/personnes": jsonResponse({}, 500) });
    renderWithStore(<PersonsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter une personne" })
    );
    await userEvent.type(screen.getByPlaceholderText("Prénom *"), "Lucie");
    await userEvent.type(screen.getByPlaceholderText("Nom *"), "Bernard");
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter la personne" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Échec de l'ajout de la personne. Veuillez réessayer."
      )
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("exige le prénom et le nom", async () => {
    setup();
    renderWithStore(<PersonsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter une personne" })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter la personne" })
    );

    expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      false
    );
  });

  it("retrouve un numéro international tapé à la française", async () => {
    setup({
      "GET /api/personnes": [
        ...persons,
        {
          id: "p5",
          firstName: "Marie",
          lastName: "Morel",
          phoneNumber: "+33611223344",
        },
      ],
    });
    renderWithStore(<PersonsPage />);
    const search = await screen.findByPlaceholderText(
      "Rechercher une personne..."
    );

    for (const query of ["06 11 22", "0611", "+33 6 11"]) {
      await userEvent.clear(search);
      await userEvent.type(search, query);
      expect(screen.getByText("Marie Morel")).toBeInTheDocument();
      expect(screen.queryByText("Jean Dupont")).not.toBeInTheDocument();
    }
  });

  it("indique une liste vide, le chargement et redirige sans connexion", async () => {
    setup({ "GET /api/personnes": [] });
    const { unmount } = renderWithStore(<PersonsPage />);
    expect(
      await screen.findByText("Aucune personne trouvée.")
    ).toBeInTheDocument();
    unmount();

    renderWithStore(<PersonsPage />, null);
    expect(screen.getByText("Redirection en cours...")).toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
});

describe("Fiche d'une personne", () => {
  let api: ReturnType<typeof mockApi>;

  const setup = (extra: Record<string, unknown> = {}) => {
    api = mockApi({
      "GET /api/personnes": persons,
      "GET /api/personnes/p1/territoires": [
        {
          id: "as1",
          territory: { territoryId: "t1", name: "R-12" },
          assignmentDate: "2025-01-01",
          returnDate: "2025-03-01",
        },
        {
          id: "as2",
          territory: { territoryId: "t2", name: "R-13" },
          assignmentDate: "2026-09-01",
          returnDate: null,
        },
        {
          id: "as3",
          territory: { territoryId: "t3", name: "R-14" },
          assignmentDate: "2025-06-01",
          returnDate: "2025-08-01",
        },
      ],
      "GET /api/personnes/p1/acces": {
        personId: "p1",
        status: "AUCUN",
        hasPhone: true,
        activeTerritories: 1,
        link: null,
      },
      "PUT /api/personnes/p1": (init?: RequestInit) =>
        JSON.parse(String(init?.body)),
      ...extra,
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    push.mockClear();
  });

  it("affiche les informations, les territoires (en cours d'abord) et l'accès numérique", async () => {
    setup();
    renderWithStore(<PersonDetail />);

    expect(
      await screen.findByText("Détails de Jean Dupont")
    ).toBeInTheDocument();
    expect(screen.getByText("jean@exemple.fr")).toBeInTheDocument();
    const items = await screen.findAllByRole("listitem");
    expect(items.map((li) => li.textContent?.match(/R-\d+/)?.[0])).toEqual([
      "R-13",
      "R-14",
      "R-12",
    ]);
    expect(within(items[0]).getByText("En cours")).toBeInTheDocument();
    expect(await screen.findByText("Accès numérique")).toBeInTheDocument();
  });

  it("modifie la personne", async () => {
    setup();
    renderWithStore(<PersonDetail />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Modifier" })
    );
    expect(screen.getByText("Modifier les informations")).toBeInTheDocument();
    const lastName = screen.getByLabelText("Nom :");
    await userEvent.clear(lastName);
    await userEvent.type(lastName, "Dupond");
    await userEvent.click(screen.getByRole("button", { name: "Sauvegarder" }));

    await waitFor(() =>
      expect(screen.getByText("Détails de Jean Dupond")).toBeInTheDocument()
    );
    const put = api.mock.calls.find(([, init]) => init?.method === "PUT")!;
    expect(JSON.parse(String(put[1]?.body))).toEqual(
      expect.objectContaining({
        id: "p1",
        firstName: "Jean",
        lastName: "Dupond",
        email: "jean@exemple.fr",
      })
    );
  });

  it("annule la modification", async () => {
    setup();
    renderWithStore(<PersonDetail />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Modifier" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.getByText("Détails de Jean Dupont")).toBeInTheDocument();
  });

  it("indique une personne introuvable, sans territoire, ou une erreur", async () => {
    setup({
      "GET /api/personnes": [{ id: "autre", firstName: "X", lastName: "Y" }],
    });
    const { unmount } = renderWithStore(<PersonDetail />);
    expect(await screen.findByText("Personne introuvable")).toBeInTheDocument();
    unmount();

    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    setup({ "GET /api/personnes/p1/territoires": [] });
    const second = renderWithStore(<PersonDetail />);
    expect(
      await screen.findByText("Aucun territoire assigné")
    ).toBeInTheDocument();
    second.unmount();

    renderWithStore(<PersonDetail />, "ADMIN", {
      persons: { error: "Serveur indisponible", persons: persons as never },
    });
    expect(screen.getByText("Serveur indisponible")).toBeInTheDocument();
  });

  it("redirige sans utilisateur connecté", async () => {
    setup();
    renderWithStore(<PersonDetail />, null);

    expect(screen.getByText("Redirection en cours...")).toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
});
