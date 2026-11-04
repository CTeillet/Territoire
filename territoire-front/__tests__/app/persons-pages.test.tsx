import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PersonsPage from "@/app/(app)/personnes/page";
import PersonDetail from "@/app/(app)/personnes/[id]/page";
import { toast } from "sonner";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";
import { labelAfterAssignment } from "@/components/shared/assignment-label-file";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useParams: () => ({ id: "p1" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// Étiquette d'attribution : testée à part, on vérifie seulement qu'elle est demandée
vi.mock(
  "@/components/shared/assignment-label-file",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/components/shared/assignment-label-file")
    >()),
    labelAfterAssignment: vi.fn(),
  })
);

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

    // Prénom et nom dans n'importe quel ordre, sans casse ni accents
    for (const query of ["jean dupont", "DUPONT Jean", "jéan dup"]) {
      await userEvent.clear(search);
      await userEvent.type(search, query);
      expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
      expect(screen.queryByText("Anne Martin")).not.toBeInTheDocument();
    }

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

  it("ne propose la suppression qu'aux administrateurs et superviseurs", async () => {
    setup();
    renderWithStore(<PersonsPage />, "GESTIONNAIRE");

    expect(await screen.findByText("Anne Martin")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Supprimer Anne Martin" })
    ).not.toBeInTheDocument();
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

  it("affiche le motif d'un refus de la création", async () => {
    setup({
      "POST /api/personnes": jsonResponse(
        { status: 400, error: "Le nom est requis" },
        400
      ),
    });
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
      expect(toast.error).toHaveBeenCalledWith("Le nom est requis")
    );
  });

  it("refuse un prénom fait d'espaces sans appeler le serveur", async () => {
    setup();
    renderWithStore(<PersonsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter une personne" })
    );
    await userEvent.type(screen.getByPlaceholderText("Prénom *"), "   ");
    await userEvent.type(screen.getByPlaceholderText("Nom *"), "Bernard");
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter la personne" })
    );

    expect(await screen.findByText("Le prénom est requis")).toBeInTheDocument();
    expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      false
    );
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
    expect(await screen.findByText("Aucune personne")).toBeInTheDocument();
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
      "DELETE /api/personnes/p1": null,
      ...extra,
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    push.mockClear();
    replace.mockClear();
  });

  it("affiche les informations, les territoires (en cours d'abord) et l'accès numérique", async () => {
    setup();
    renderWithStore(<PersonDetail />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Jean Dupont" })
    ).toBeInTheDocument();
    expect(screen.getByText("jean@exemple.fr")).toBeInTheDocument();
    const items = await screen.findAllByRole("listitem");
    expect(items.map((li) => li.textContent?.match(/R-\d+/)?.[0])).toEqual([
      "R-13",
      "R-14",
      "R-12",
    ]);
    expect(within(items[0]).getByText("En cours")).toBeInTheDocument();
    // Chaque attribution mène à la fiche de son territoire (bouton et nom)
    expect(
      within(items[0]).getByRole("link", { name: "Voir le territoire R-13" })
    ).toHaveAttribute("href", "/territoires/t2");
    expect(
      within(items[1]).getByRole("link", { name: "R-14" })
    ).toHaveAttribute("href", "/territoires/t3");
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
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Jean Dupond" })
      ).toBeInTheDocument()
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

  it("refuse un nom vide sans appeler le serveur et reste en édition", async () => {
    setup();
    renderWithStore(<PersonDetail />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Modifier" })
    );
    const lastName = screen.getByLabelText("Nom :");
    await userEvent.clear(lastName);
    await userEvent.type(lastName, "   ");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(toast.error).toHaveBeenCalledWith("Le prénom et le nom sont requis");
    expect(api.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(
      false
    );
    expect(screen.getByText("Modifier les informations")).toBeInTheDocument();
  });

  it("affiche le motif d'un refus du serveur et garde la fiche en édition", async () => {
    setup({
      "PUT /api/personnes/p1": jsonResponse(
        { status: 400, error: "Le nom ne doit pas dépasser 255 caractères" },
        400
      ),
    });
    renderWithStore(<PersonDetail />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Modifier" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Le nom ne doit pas dépasser 255 caractères"
      )
    );
    // La fiche n'est pas remplacée par l'erreur : le formulaire est toujours là
    expect(screen.getByText("Modifier les informations")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom :")).toHaveValue("Dupont");
  });

  describe("attribution d'un territoire", () => {
    // « Eu ces deux dernières années » se compte à partir d'aujourd'hui : date figée (seulement Date)
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-04T12:00:00"));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const territory = (
      id: string,
      name: string,
      extra: Record<string, unknown> = {}
    ) => ({
      type: "Feature",
      geometry: null,
      properties: {
        id,
        name,
        status: "AVAILABLE",
        city: "Rennes",
        type: "HOUSE",
        lastVisitedOn: "2026-01-10",
        assignedTo: "N/A",
        assignedOn: "N/A",
        waitedFor: "N/A",
        assignments: [],
        ...extra,
      },
    });
    const geojson = {
      type: "FeatureCollection",
      features: [
        territory("t5", "R-20", { lastVisitedOn: "2026-05-02" }),
        // Jean a eu R-14 (t3) en 2025 : proposé en dernier
        territory("t3", "R-14", { lastVisitedOn: "2025-08-01" }),
        territory("t6", "R-21", { lastVisitedOn: "nouveau" }),
        territory("t7", "B-1", { city: "Bruz", type: "BUILDING" }),
        territory("t8", "R-22", { status: "ASSIGNED" }),
      ],
    };

    const openDialog = async () => {
      await userEvent.click(
        await screen.findByRole("button", { name: "Attribuer un territoire" })
      );
      return screen.findByRole("dialog");
    };
    const proposed = (dialog: HTMLElement) =>
      within(dialog)
        .getAllByRole("radio")
        .map((radio) => radio.closest("label")!.textContent);

    it("propose les territoires disponibles, les plus indiqués d'abord, et attribue le choisi", async () => {
      const assignment = {
        id: "as9",
        territory: { territoryId: "t6", name: "R-21", status: "ASSIGNED" },
        person: persons[0],
        assignmentDate: "2026-11-04",
        dueDate: "2027-03-04",
        returnDate: null,
      };
      setup({
        "GET /api/territoires/geojson": geojson,
        "POST /api/territoires/t6/attribuer/p1": assignment,
      });
      renderWithStore(<PersonDetail />);

      const dialog = await openDialog();
      expect(
        within(dialog).getByText("Attribuer un territoire à Jean Dupont")
      ).toBeInTheDocument();
      // Jean a déjà R-13 en cours
      expect(dialog).toHaveTextContent("Jean a déjà 1 territoire en cours.");
      await waitFor(() => expect(proposed(dialog)).toHaveLength(4));
      expect(proposed(dialog)).toEqual([
        "R-21Rennes · Pavillon · jamais parcouru",
        "B-1Bruz · Immeuble · parcouru le 10 janv. 2026",
        "R-20Rennes · Pavillon · parcouru le 2 mai 2026",
        "R-14Rennes · Pavillon · parcouru le 1 août 2025 · déjà eu par Jean le 1 juin 2025",
      ]);

      await userEvent.click(
        within(dialog).getByRole("radio", { name: /R-21/ })
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Attribuer" })
      );

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          "R-21 attribué à Jean Dupont"
        )
      );
      expect(api).toHaveBeenCalledWith(
        "/api/territoires/t6/attribuer/p1",
        expect.objectContaining({ method: "POST" })
      );
      expect(labelAfterAssignment).toHaveBeenCalledWith(assignment);
      // La liste des territoires de Jean est rechargée
      expect(
        api.mock.calls.filter(
          ([url]) => url === "/api/personnes/p1/territoires"
        )
      ).toHaveLength(2);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("filtre par ville et par type", async () => {
      setup({ "GET /api/territoires/geojson": geojson });
      renderWithStore(<PersonDetail />);
      const dialog = await openDialog();
      await waitFor(() => expect(proposed(dialog)).toHaveLength(4));

      await userEvent.selectOptions(
        within(dialog).getByRole("combobox", { name: "Type" }),
        "Immeuble"
      );
      expect(proposed(dialog)).toEqual([
        "B-1Bruz · Immeuble · parcouru le 10 janv. 2026",
      ]);

      await userEvent.selectOptions(
        within(dialog).getByRole("combobox", { name: "Ville" }),
        "Rennes"
      );
      expect(
        within(dialog).getByText(
          "Aucun territoire disponible avec ces critères pour le moment."
        )
      ).toBeInTheDocument();
    });

    it("affiche le refus du serveur sans fermer la fenêtre", async () => {
      setup({
        "GET /api/territoires/geojson": geojson,
        "POST /api/territoires/t6/attribuer/p1": jsonResponse(
          { status: 409, error: "Ce territoire n'est pas disponible" },
          409
        ),
      });
      renderWithStore(<PersonDetail />);
      const dialog = await openDialog();

      await userEvent.click(
        await within(dialog).findByRole("radio", { name: /R-21/ })
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Attribuer" })
      );

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Ce territoire n'est pas disponible"
        )
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("n'est pas proposée à un simple utilisateur", async () => {
      setup();
      renderWithStore(<PersonDetail />, "UTILISATEUR");

      await screen.findByRole("heading", { level: 1, name: "Jean Dupont" });
      expect(
        screen.queryByRole("button", { name: "Attribuer un territoire" })
      ).not.toBeInTheDocument();
    });
  });

  it("annule la modification", async () => {
    setup();
    renderWithStore(<PersonDetail />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Modifier" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Jean Dupont" })
    ).toBeInTheDocument();
  });

  it("supprime la personne après confirmation et revient à la liste", async () => {
    setup();
    renderWithStore(<PersonDetail />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer Jean Dupont" })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Supprimer",
      })
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/personnes"));
    expect(toast.success).toHaveBeenCalledWith(
      "La personne a bien été supprimée."
    );
    expect(
      api.mock.calls.some(
        ([url, init]) =>
          init?.method === "DELETE" && String(url).endsWith("/personnes/p1")
      )
    ).toBe(true);
    expect(screen.getByText("Redirection en cours...")).toBeInTheDocument();
    expect(screen.queryByText("Personne introuvable")).not.toBeInTheDocument();
  });

  it("garde la fiche et affiche le motif si la suppression est refusée", async () => {
    setup({
      "DELETE /api/personnes/p1": jsonResponse(
        { error: "Impossible : historique d'attributions" },
        409
      ),
    });
    renderWithStore(<PersonDetail />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer Jean Dupont" })
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
    expect(
      screen.getByRole("heading", { level: 1, name: "Jean Dupont" })
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("masque la suppression pour un simple utilisateur", async () => {
    setup();
    renderWithStore(<PersonDetail />, "UTILISATEUR");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Jean Dupont" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Supprimer Jean Dupont" })
    ).not.toBeInTheDocument();
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
