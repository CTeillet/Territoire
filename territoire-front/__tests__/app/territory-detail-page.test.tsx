import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TerritoryPage from "@/app/(app)/territoires/[id]/page";
import TerritoryHeader from "@/components/territory/id/territory-header";
import AddressNotToDoList from "@/components/territory/id/address-not-to-do-list";
import AssignmentsList from "@/components/territory/id/assignments-list";
import TerritoryMapViewer from "@/components/territory/id/territory-map-viewer";
import { Territory } from "@/models/territory";
import { Assignment } from "@/models/assignment";
import { TerritoryType } from "@/models/territory-type";
import {
  jsonResponse,
  mockApi,
  renderWithStore,
  TEST_CITY,
} from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: "t1" }),
}));
vi.mock("next/dynamic", () => import("../mocks/leaflet-dynamic"));

const territory = (overrides: Partial<Territory> = {}): Territory => ({
  id: "t1",
  name: "R-12",
  status: "ASSIGNED",
  type: TerritoryType.HOUSE,
  lastModifiedDate: "2026-10-01",
  note: "Commencer par la rue des Lilas",
  city: TEST_CITY,
  addressesNotToDo: [
    {
      id: "a1",
      number: "12",
      street: "rue des Lilas",
      zipCode: "35000",
      city: "Rennes",
    },
    {
      id: "a2",
      number: "4",
      street: "rue des Roses",
      zipCode: "35000",
      city: "Rennes",
    },
  ] as Territory["addressesNotToDo"],
  assignments: [],
  geojson: '{"type":"FeatureCollection","features":[]}',
  lastVisitedOn: "2026-01-01",
  assignedOn: "2026-09-01",
  waitedFor: "2027-01-01",
  assignedTo: "Jean Dupont",
  ...overrides,
});

const assignment = (overrides: Partial<Assignment> = {}): Assignment => ({
  id: "as1",
  territory: {
    territoryId: "t1",
    name: "R-12",
    status: "ASSIGNED",
    cityId: "c1",
    cityName: "Rennes",
  },
  person: { id: "p1", firstName: "Jean", lastName: "Dupont" },
  assignmentDate: "2026-09-01",
  dueDate: "2027-01-01",
  returnDate: null,
  ...overrides,
});

describe("Page d'un territoire", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    push.mockClear();
    URL.createObjectURL = vi.fn(() => "blob:carte");
    URL.revokeObjectURL = vi.fn();
  });

  it("affiche l'en-tête, la carte, les adresses et l'historique", async () => {
    mockApi({
      "GET /api/territoires/t1": territory({
        territoryMapId: "t1",
        assignments: [assignment()],
      }),
      "GET /api/territoires/t1/carte": {},
      "GET /api/villes": [TEST_CITY],
      "GET /api/personnes": [],
    });
    renderWithStore(<TerritoryPage />);

    expect(
      await screen.findByRole("heading", { name: "R-12" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Commencer par la rue des Lilas")
    ).toBeInTheDocument();
    expect(screen.getByText(/12, rue des Lilas/)).toBeInTheDocument();
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(await screen.findByAltText("Carte du territoire")).toHaveAttribute(
      "src",
      "blob:carte"
    );
    expect(screen.getByRole("link", { name: /Retour/ })).toHaveAttribute(
      "href",
      "/territoires"
    );
  });

  it("indique l'absence de carte téléversée", async () => {
    mockApi({
      "GET /api/territoires/t1": territory(),
      "GET /api/villes": [TEST_CITY],
      "GET /api/personnes": [],
    });
    renderWithStore(<TerritoryPage />);

    expect(
      await screen.findByText(
        "Aucune carte n'a été téléchargée pour ce territoire."
      )
    ).toBeInTheDocument();
  });

  it("affiche le chargement puis redirige sans utilisateur connecté", async () => {
    mockApi({ "GET /api/territoires/t1": jsonResponse({}, 500) });
    const { unmount } = renderWithStore(<TerritoryPage />);
    expect(screen.getByText("Chargement du territoire...")).toBeInTheDocument();
    unmount();

    renderWithStore(<TerritoryPage />, null);
    expect(screen.getByText("Redirection en cours...")).toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
});

describe("En-tête d'un territoire", () => {
  let api: ReturnType<typeof mockApi>;

  const renderHeader = (
    role: "ADMIN" | "UTILISATEUR" = "ADMIN",
    props: Partial<React.ComponentProps<typeof TerritoryHeader>> = {}
  ) => {
    api = mockApi({
      "GET /api/villes": [
        TEST_CITY,
        { ...TEST_CITY, id: "c2", name: "Cesson" },
      ],
      "GET /api/personnes": [],
      "PUT /api/territoires/t1": { id: "t1", name: "R-12 bis" },
      "DELETE /api/territoires/t1": null,
    });
    return renderWithStore(
      <TerritoryHeader
        territoryId="t1"
        name="R-12"
        city="Rennes"
        status="AVAILABLE"
        type={TerritoryType.HOUSE}
        lastModifiedDate="2026-10-01"
        note="Note interne"
        {...props}
      />,
      role
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockClear();
  });

  it("affiche les informations du territoire", () => {
    renderHeader();

    expect(screen.getByText("Rennes")).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.getByText("Pavillon")).toBeInTheDocument();
    expect(
      screen.getByText(/Dernière modification : 2026-10-01/)
    ).toBeInTheDocument();
    expect(screen.getByText("Note interne")).toBeInTheDocument();
  });

  it("affiche des valeurs par défaut sans type ni note", () => {
    renderHeader("ADMIN", {
      type: undefined,
      note: null,
      lastModifiedDate: null,
    });

    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("Aucune note")).toBeInTheDocument();
    expect(screen.queryByText(/Dernière modification/)).not.toBeInTheDocument();
  });

  it("modifie le nom, la note, la ville et le type", async () => {
    renderHeader();

    await userEvent.click(
      screen.getByRole("button", { name: "Modifier le territoire" })
    );
    const [nameInput, noteInput] = screen.getAllByRole("textbox");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "R-12 bis");
    await userEvent.clear(noteInput);
    await userEvent.type(noteInput, "Nouvelle note");
    const [citySelect, typeSelect] = screen.getAllByRole("combobox");
    await userEvent.click(citySelect);
    await userEvent.click(
      await screen.findByRole("option", { name: "Cesson" })
    );
    await userEvent.click(typeSelect);
    await userEvent.click(
      await screen.findByRole("option", { name: "Immeuble" })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Enregistrer les modifications" })
    );

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/api/territoires/t1",
        expect.objectContaining({ method: "PUT" })
      )
    );
    const put = api.mock.calls.find(([, init]) => init?.method === "PUT")!;
    expect(JSON.parse(String(put[1]?.body))).toEqual({
      name: "R-12 bis",
      note: "Nouvelle note",
      cityId: "c2",
      type: "BUILDING",
    });
  });

  it("annule la modification", async () => {
    renderHeader();

    await userEvent.click(
      screen.getByRole("button", { name: "Modifier le territoire" })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Annuler les modifications" })
    );

    expect(screen.getByRole("heading", { name: "R-12" })).toBeInTheDocument();
    expect(api.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(
      false
    );
  });

  it("supprime le territoire après confirmation puis revient à la liste", async () => {
    renderHeader();

    await userEvent.click(
      screen.getByRole("button", { name: "Supprimer le territoire" })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Supprimer",
      })
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith("/territoires"));
  });

  it("reste sur la page si la suppression échoue", async () => {
    renderHeader();
    api.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "DELETE" ? jsonResponse({}, 409) : jsonResponse([])
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Supprimer le territoire" })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Supprimer",
      })
    );

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/api/territoires/t1", {
        method: "DELETE",
      })
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("n'autorise pas la modification à un simple utilisateur", () => {
    renderHeader("UTILISATEUR");

    expect(
      screen.queryByRole("button", { name: "Modifier le territoire" })
    ).not.toBeInTheDocument();
  });
});

describe("Adresses à ne pas visiter", () => {
  let api: ReturnType<typeof mockApi>;

  const renderList = (selected: Territory | null = territory()) => {
    api = mockApi({
      "POST /api/territoires/t1/adresses-a-ne-pas-visiter": (
        init?: RequestInit
      ) => ({ id: "a3", ...JSON.parse(String(init?.body)) }),
      "PUT /api/territoires/t1/adresses-a-ne-pas-visiter/a1": (
        init?: RequestInit
      ) => ({ id: "a1", ...JSON.parse(String(init?.body)) }),
      "DELETE /api/territoires/t1/adresses-a-ne-pas-visiter/a2": null,
    });
    return renderWithStore(<AddressNotToDoList />, "ADMIN", {
      territories: { selectedTerritory: selected },
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("ajoute une adresse complète et vide le formulaire", async () => {
    renderList();

    await userEvent.type(screen.getByPlaceholderText("Numéro"), "8");
    await userEvent.type(screen.getByPlaceholderText("Rue"), "rue des Iris");
    await userEvent.type(screen.getByPlaceholderText("Code postal"), "35000");
    await userEvent.type(screen.getByPlaceholderText("Ville"), "Rennes");
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter l'adresse" })
    );

    expect(await screen.findByText(/8, rue des Iris/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Rue")).toHaveValue("");
  });

  it("n'ajoute pas une adresse incomplète", async () => {
    renderList();

    await userEvent.type(screen.getByPlaceholderText("Rue"), "rue des Iris");
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter l'adresse" })
    );

    expect(api).not.toHaveBeenCalled();
  });

  it("modifie une adresse", async () => {
    renderList();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Modifier l'adresse" })[0]
    );
    const number = screen.getByDisplayValue("12");
    await userEvent.clear(number);
    await userEvent.type(number, "14");
    await userEvent.click(
      screen.getByRole("button", { name: "Enregistrer l'adresse" })
    );

    expect(await screen.findByText(/14, rue des Lilas/)).toBeInTheDocument();
  });

  it("supprime une adresse après confirmation", async () => {
    renderList();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Supprimer l'adresse" })[1]
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("4 rue des Roses")).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Supprimer" })
    );

    await waitFor(() =>
      expect(screen.queryByText(/rue des Roses/)).not.toBeInTheDocument()
    );
  });

  it.each([
    ["l'ajout", "❌ Erreur lors de l'ajout de l'adresse :"],
    ["la modification", "❌ Erreur lors de la modification de l'adresse :"],
    ["la suppression", "❌ Erreur lors de la suppression de l'adresse :"],
  ])("journalise l'échec de %s", async (action, message) => {
    renderList();
    api.mockResolvedValue(jsonResponse({}, 500));

    if (action === "l'ajout") {
      for (const placeholder of ["Numéro", "Rue", "Code postal", "Ville"]) {
        fireEvent.change(screen.getByPlaceholderText(placeholder), {
          target: { value: "x" },
        });
      }
      await userEvent.click(
        screen.getByRole("button", { name: "Ajouter l'adresse" })
      );
    } else if (action === "la modification") {
      await userEvent.click(
        screen.getAllByRole("button", { name: "Modifier l'adresse" })[0]
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Enregistrer l'adresse" })
      );
    } else {
      await userEvent.click(
        screen.getAllByRole("button", { name: "Supprimer l'adresse" })[0]
      );
      await userEvent.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "Supprimer",
        })
      );
    }

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(message, expect.anything())
    );
  });

  it("ne fait rien sans territoire sélectionné", async () => {
    renderList(null);

    for (const placeholder of ["Numéro", "Rue", "Code postal", "Ville"]) {
      fireEvent.change(screen.getByPlaceholderText(placeholder), {
        target: { value: "x" },
      });
    }
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter l'adresse" })
    );

    expect(api).not.toHaveBeenCalled();
  });
});

describe("Historique des attributions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("indique l'absence d'historique", () => {
    renderWithStore(<AssignmentsList assignments={[]} />);

    expect(
      screen.getByText("Pas d'historique pour ce territoire")
    ).toBeInTheDocument();
  });

  it("liste les attributions terminées puis en cours, avec campagnes", () => {
    renderWithStore(
      <AssignmentsList
        assignments={[
          assignment(),
          assignment({
            id: "as2",
            person: undefined,
            campaign: { name: "Automne" } as never,
            assignmentDate: "2026-01-01",
            returnDate: "2026-02-01",
          }),
          assignment({
            id: "as3",
            person: undefined,
            assignmentDate: "2025-01-01",
            returnDate: "2025-03-01",
          }),
          assignment({
            id: "as4",
            person: { id: "p2", firstName: "Anne", lastName: "Martin" },
            assignmentDate: "2025-06-01",
            returnDate: "2025-08-01",
          }),
        ]}
      />
    );

    const names = screen
      .getAllByRole("listitem")
      .map((li) => li.querySelector("strong")?.textContent);
    expect(names).toEqual([
      "Campagne: Automne",
      "Anne Martin",
      "N/A",
      "Jean Dupont",
    ]);
    expect(screen.getByText(/En cours/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", {
        name: "Voir les détails de la personne",
      })[0]
    ).toHaveAttribute("href", "/personnes/p2");
  });

  const openDatesDialog = () =>
    userEvent.click(screen.getByRole("button", { name: "Modifier les dates" }));

  it("modifie les dates de l'attribution en cours (l'échéance par défaut suit)", async () => {
    const api = mockApi({
      "PUT /api/attributions/as1": assignment({
        assignmentDate: "2026-05-15",
        dueDate: "2026-09-15",
        territory: { ...assignment().territory, status: "LATE" },
      }),
    });
    renderWithStore(<AssignmentsList assignments={[assignment()]} />);

    await openDatesDialog();
    expect(screen.queryByLabelText("Date de retour")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Date d'attribution"), {
      target: { value: "2026-05-15" },
    });
    expect(screen.getByLabelText("Échéance")).toHaveValue("2026-09-15");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/api/attributions/as1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            assignmentDate: "2026-05-15",
            dueDate: "2026-09-15",
            returnDate: null,
          }),
        })
      )
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("garde une échéance prolongée et modifie la date de retour d'une attribution terminée", async () => {
    const returned = assignment({
      dueDate: "2027-03-01",
      returnDate: "2026-10-01",
    });
    const api = mockApi({
      "PUT /api/attributions/as1": assignment({
        returnDate: "2026-09-20",
        territory: { ...assignment().territory, status: "PENDING" },
      }),
    });
    renderWithStore(<AssignmentsList assignments={[returned]} />);

    await openDatesDialog();
    fireEvent.change(screen.getByLabelText("Date d'attribution"), {
      target: { value: "2026-08-20" },
    });
    expect(screen.getByLabelText("Échéance")).toHaveValue("2027-03-01");
    fireEvent.change(screen.getByLabelText("Date de retour"), {
      target: { value: "2026-09-20" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/api/attributions/as1",
        expect.objectContaining({
          body: JSON.stringify({
            assignmentDate: "2026-08-20",
            dueDate: "2027-03-01",
            returnDate: "2026-09-20",
          }),
        })
      )
    );
  });

  it("signale des dates incohérentes puis l'erreur renvoyée par le serveur", async () => {
    const api = mockApi({
      "PUT /api/attributions/as1": jsonResponse(
        { error: "Ce territoire vient d'être modifié par quelqu'un d'autre" },
        409
      ),
    });
    renderWithStore(
      <AssignmentsList
        assignments={[assignment({ returnDate: "2026-10-01" })]}
      />
    );

    await openDatesDialog();
    fireEvent.change(screen.getByLabelText("Date de retour"), {
      target: { value: "2026-08-01" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "La date de retour ne peut pas précéder la date d'attribution"
    );
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Date de retour"), {
      target: { value: "2026-09-10" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ce territoire vient d'être modifié par quelqu'un d'autre"
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Un seul envoi : le premier clic était bloqué par la date incohérente
    expect(
      api.mock.calls.filter(([, init]) => init?.method === "PUT")
    ).toHaveLength(1);
  });

  it("annule la modification des dates", async () => {
    const api = mockApi({});
    renderWithStore(<AssignmentsList assignments={[assignment()]} />);

    await openDatesDialog();
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(api).not.toHaveBeenCalledWith(
      "/api/attributions/as1",
      expect.anything()
    );
  });

  it("fait suivre l'échéance selon la durée d'attribution des paramètres", async () => {
    mockApi({
      "GET /api/settings/durees": {
        assignmentDurationMonths: 3,
        pendingDurationMonths: 4,
      },
    });
    renderWithStore(
      <AssignmentsList assignments={[assignment({ dueDate: "2026-12-01" })]} />
    );

    await openDatesDialog();
    await screen.findByText("Par défaut : 3 mois après l'attribution");
    fireEvent.change(screen.getByLabelText("Date d'attribution"), {
      target: { value: "2026-05-15" },
    });

    expect(screen.getByLabelText("Échéance")).toHaveValue("2026-08-15");
  });

  it("ne propose pas la modification aux utilisateurs ni pour une campagne", () => {
    const campaign = assignment({
      id: "as2",
      person: undefined,
      campaign: { name: "Automne" } as never,
      returnDate: "2026-10-01",
    });
    const { unmount } = renderWithStore(
      <AssignmentsList assignments={[assignment()]} />,
      "UTILISATEUR"
    );
    expect(
      screen.queryByRole("button", { name: "Modifier les dates" })
    ).not.toBeInTheDocument();
    unmount();

    renderWithStore(
      <AssignmentsList assignments={[campaign]} />,
      "GESTIONNAIRE"
    );
    expect(
      screen.queryByRole("button", { name: "Modifier les dates" })
    ).not.toBeInTheDocument();
  });
});

describe("Visionneuse de la carte téléversée", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:carte");
    URL.revokeObjectURL = vi.fn();
  });

  it("affiche l'image puis libère l'URL au démontage", async () => {
    mockApi({ "GET /api/territoires/t1/carte": {} });
    const { unmount } = render(<TerritoryMapViewer territoryMapId="t1" />);

    const image = await screen.findByAltText("Carte du territoire");
    fireEvent.load(image);
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:carte");
  });

  it("affiche une erreur si l'image ne s'affiche pas", async () => {
    mockApi({ "GET /api/territoires/t1/carte": {} });
    render(<TerritoryMapViewer territoryMapId="t1" />);

    fireEvent.error(await screen.findByAltText("Carte du territoire"));

    expect(
      screen.getByText(/Impossible de charger l'image/)
    ).toBeInTheDocument();
  });

  it("affiche une erreur si la carte est introuvable ou le réseau coupé", async () => {
    mockApi({ "GET /api/territoires/t1/carte": jsonResponse({}, 404) });
    const { unmount } = render(<TerritoryMapViewer territoryMapId="t1" />);
    expect(
      await screen.findByText(/Impossible de charger l'image/)
    ).toBeInTheDocument();
    unmount();

    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({}).mockRejectedValue(new Error("réseau"));
    render(<TerritoryMapViewer territoryMapId="t1" />);
    expect(
      await screen.findByText(/Impossible de charger l'image/)
    ).toBeInTheDocument();
  });
});
