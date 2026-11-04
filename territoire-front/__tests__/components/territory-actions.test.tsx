import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast, Toaster } from "sonner";
import { TerritoryDataActionButtons } from "@/components/shared/territory-data-action-buttons";
import AssignTerritoryDialog from "@/components/territory/assign-territory-dialog";
import ExtendConfirmationDialog from "@/components/territory/extend-confirmation-dialog";
import { addMonths, addWeeks, format } from "date-fns";
import * as assignmentLabel from "@/lib/assignment-label";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";
import {
  captureDownloads,
  stubIPhone,
  stubNativeApp,
  unstubNativeApp,
} from "../mocks/ios";

const persons = [
  { id: "p1", firstName: "Jean", lastName: "Dupont" },
  { id: "p2", firstName: "Anne", lastName: "Martin" },
];
const assignment = {
  id: "as1",
  territory: { territoryId: "t1" },
  assignmentDate: "2026-10-11",
  dueDate: "2027-02-11",
};

describe("Boutons d'action d'un territoire", () => {
  let api: ReturnType<typeof mockApi>;

  const setup = (extra: Record<string, unknown> = {}) => {
    api = mockApi({
      "GET /api/personnes": persons,
      "POST /api/personnes": {
        id: "p3",
        firstName: "Paul",
        lastName: "Durand",
      },
      "POST /api/territoires/t1/attribuer": assignment,
      "POST /api/territoires/t1/retour": assignment,
      "POST /api/territoires/t1/prolongation": assignment,
      "POST /api/territoires/t1/annuler-assignation": assignment,
      "POST /api/territoires/t1/carte": {},
      "GET /api/territoires/t1/carte": {},
      ...extra,
    });
  };

  const button = (name: string) => screen.getByRole("button", { name });

  // Hors action principale, les actions sont dans le menu « Plus d'actions »
  const openMenu = () => userEvent.click(button("Plus d'actions"));
  const chooseInMenu = async (name: string) => {
    await openMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name }));
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("propose l'attribution d'un territoire disponible", async () => {
    setup();
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />
    );

    expect(button("Assigner")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retour en stock" })
    ).not.toBeInTheDocument();
    await openMenu();
    expect(
      screen.getByRole("menuitem", { name: "Voir les détails" })
    ).toHaveAttribute("href", "/territoires/t1");
    expect(
      screen.queryByRole("menuitem", { name: "Voir la carte" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Annuler l'assignation" })
    ).not.toBeInTheDocument();
  });

  it("attribue le territoire à une personne existante", async () => {
    setup();
    const autoPrint = vi
      .spyOn(assignmentLabel, "autoPrintAssignmentLabel")
      .mockResolvedValue();
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />
    );
    await waitFor(() => expect(api).toHaveBeenCalledWith("/api/personnes"));

    await userEvent.click(button("Assigner"));
    await userEvent.click(await screen.findByRole("combobox"));
    await userEvent.click(await screen.findByText("Anne Martin"));
    await userEvent.click(screen.getByText("Confirmer l'assignation"));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/api/territoires/t1/attribuer/p2",
        expect.objectContaining({ method: "POST" })
      )
    );
    // Étiquette imprimée si l'appareil est réglé pour
    await waitFor(() => expect(autoPrint).toHaveBeenCalledWith(assignment));
  });

  describe("sur iPhone", () => {
    const assigned = { ...assignment, person: persons[1] };

    const assignToAnne = async () => {
      render(<Toaster />);
      renderWithStore(
        <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />
      );
      await waitFor(() => expect(api).toHaveBeenCalledWith("/api/personnes"));
      await userEvent.click(button("Assigner"));
      await userEvent.click(await screen.findByRole("combobox"));
      await userEvent.click(await screen.findByText("Anne Martin"));
      await userEvent.click(screen.getByText("Confirmer l'assignation"));
    };

    beforeEach(() => {
      stubIPhone();
    });

    afterEach(() => {
      unstubNativeApp();
      act(() => {
        toast.dismiss();
      });
    });

    it("dans l'app iOS TMS, propose d'imprimer par l'app après l'attribution réussie, avec la date du backend", async () => {
      setup({ "POST /api/territoires/t1/attribuer": assigned });
      const postMessage = stubNativeApp();
      await assignToAnne();
      expect(
        await screen.findByText("Étiquette prête à imprimer")
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Imprimer" }));
      await waitFor(() =>
        expect(postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            action: "print",
            name: "Anne M.",
            dueDate: assigned.dueDate,
          })
        )
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      );
    });

    it("propose l'étiquette en fichier LBX, téléchargeable après la fermeture du dialogue", async () => {
      setup({ "POST /api/territoires/t1/attribuer": assigned });
      const autoPrint = vi.spyOn(assignmentLabel, "autoPrintAssignmentLabel");
      const downloads = captureDownloads();

      await assignToAnne();

      expect(await screen.findByText("Étiquette prête")).toBeInTheDocument();
      // Données renvoyées par le backend
      expect(
        screen.getByText("Anne M. · À rendre le 11/02/2027")
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Télécharger" })
      );
      expect(downloads.map(({ name }) => name)).toEqual([
        "etiquette-anne-m-2027-02-11.lbx",
      ]);
      // Ni Web Serial ni réglage d'impression automatique sur iPhone
      expect(autoPrint).not.toHaveBeenCalled();
    });

    it("garde l'attribution quand le fichier ne peut pas être généré", async () => {
      setup({ "POST /api/territoires/t1/attribuer": assigned });
      vi.spyOn(assignmentLabel, "assignmentLabelFile").mockImplementation(
        () => {
          throw new Error("Archive impossible");
        }
      );

      await assignToAnne();

      expect(
        await screen.findByText(
          "Le fichier de l'étiquette n'a pas pu être généré."
        )
      ).toBeInTheDocument();
      expect(api).toHaveBeenCalledWith(
        "/api/territoires/t1/attribuer/p2",
        expect.objectContaining({ method: "POST" })
      );
      expect(console.error).not.toHaveBeenCalledWith(
        "❌ Erreur lors de l'assignation :",
        expect.anything()
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      );
    });
  });

  it("crée une nouvelle personne puis lui attribue le territoire", async () => {
    setup();
    renderWithStore(
      <TerritoryDataActionButtons
        territoryId="t1"
        status="AVAILABLE"
        showDetails={false}
      />
    );

    await userEvent.click(button("Assigner"));
    await userEvent.type(
      await screen.findByPlaceholderText("Prénom"),
      " Paul "
    );
    await userEvent.type(screen.getByPlaceholderText("Nom"), "Durand");
    await userEvent.click(screen.getByText("Confirmer l'assignation"));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/api/territoires/t1/attribuer/p3",
        expect.anything()
      )
    );
    const created = api.mock.calls.find(
      ([url, init]) => url === "/api/personnes" && init?.method === "POST"
    )!;
    expect(JSON.parse(String(created[1]?.body))).toEqual({
      firstName: "Paul",
      lastName: "Durand",
    });
    await openMenu();
    expect(
      screen.queryByRole("menuitem", { name: "Voir les détails" })
    ).not.toBeInTheDocument();
  });

  it("n'attribue rien si la création de la personne échoue", async () => {
    setup({ "POST /api/personnes": jsonResponse({}, 500) });
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />
    );

    await userEvent.click(button("Assigner"));
    await userEvent.type(await screen.findByPlaceholderText("Prénom"), "Paul");
    await userEvent.type(screen.getByPlaceholderText("Nom"), "Durand");
    await userEvent.click(screen.getByText("Confirmer l'assignation"));

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "❌ Erreur lors de l'assignation :",
        "Échec de la création"
      )
    );
    expect(api.mock.calls.some(([url]) => url.includes("/attribuer/"))).toBe(
      false
    );
  });

  // Le retour est l'action principale, l'annulation est rangée dans le menu
  const trigger = (action: string) =>
    action === "Retour en stock"
      ? userEvent.click(button(action))
      : chooseInMenu(action);

  it.each([
    ["Retour en stock", "/api/territoires/t1/retour"],
    ["Annuler l'assignation", "/api/territoires/t1/annuler-assignation"],
  ])("%s après confirmation", async (action, url) => {
    setup();
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="LATE" />
    );

    await trigger(action);
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Confirmer",
      })
    );

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ method: "POST" })
      )
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it.each([
    [
      "Retour en stock",
      "POST /api/territoires/t1/retour",
      "❌ Erreur lors du retour du territoire :",
    ],
    [
      "Annuler l'assignation",
      "POST /api/territoires/t1/annuler-assignation",
      "❌ Erreur lors de l'annulation de l'assignation :",
    ],
    [
      "Prolonger",
      "POST /api/territoires/t1/prolongation",
      "❌ Erreur lors de la prolongation du territoire :",
    ],
  ])(
    "%s : journalise l'échec et affiche le motif du serveur",
    async (action, route, message) => {
      setup({
        [route]: jsonResponse(
          {
            timestamp: "2026-11-04T10:00:00Z",
            status: 409,
            error: "Ce territoire vient d'être modifié par quelqu'un d'autre",
            path: route.split(" ")[1],
          },
          409
        ),
      });
      render(<Toaster />);
      renderWithStore(
        <TerritoryDataActionButtons territoryId="t1" status="ASSIGNED" />
      );

      await trigger(action);
      await userEvent.click(
        within(await screen.findByRole("dialog")).getByRole("button", {
          name: "Confirmer",
        })
      );

      await waitFor(() =>
        expect(console.error).toHaveBeenCalledWith(
          message,
          "Ce territoire vient d'être modifié par quelqu'un d'autre"
        )
      );
      // Le motif seul, pas le JSON de la réponse
      expect(
        await screen.findByText(
          "Ce territoire vient d'être modifié par quelqu'un d'autre"
        )
      ).toBeInTheDocument();
      expect(screen.queryByText(/timestamp/)).not.toBeInTheDocument();
      act(() => {
        toast.dismiss();
      });
    }
  );

  it("prolonge le territoire de la durée choisie", async () => {
    setup();
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="ASSIGNED" />
    );

    await chooseInMenu("Prolonger");
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Confirmer",
      })
    );

    const expected = format(addMonths(new Date(), 4), "yyyy-MM-dd");
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        `/api/territoires/t1/prolongation?dueDate=${expected}`,
        expect.anything()
      )
    );
  });

  it("signale le territoire perdu, puis le retire des perdus", async () => {
    setup({ "PUT /api/territoires/t1/perdu": {} });
    const { unmount } = renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="ASSIGNED" />,
      "GESTIONNAIRE"
    );

    await chooseInMenu("Signaler comme perdu");
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/api/territoires/t1/perdu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lost: true }),
      })
    );
    unmount();

    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="ASSIGNED" lost />,
      "GESTIONNAIRE"
    );
    await chooseInMenu("Retirer des territoires perdus");
    await waitFor(() =>
      expect(api).toHaveBeenLastCalledWith("/api/territoires/t1/perdu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lost: false }),
      })
    );
  });

  it("masque les actions de gestion à un simple utilisateur", async () => {
    setup();
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="ASSIGNED" />,
      "UTILISATEUR"
    );

    expect(
      screen.queryByRole("button", { name: "Retour en stock" })
    ).not.toBeInTheDocument();
    await openMenu();
    expect(
      screen.getByRole("menuitem", { name: "Voir les détails" })
    ).toBeInTheDocument();
    for (const name of [
      "Prolonger",
      "Importer une carte",
      "Signaler comme perdu",
      "Annuler l'assignation",
    ]) {
      expect(screen.queryByRole("menuitem", { name })).not.toBeInTheDocument();
    }
  });

  it("téléverse une carte de territoire puis recharge la page", async () => {
    setup();
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    const { container } = renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />
    );
    const input = container.querySelector(
      "input[type=file]"
    ) as HTMLInputElement;
    const click = vi.spyOn(input, "click");

    await chooseInMenu("Importer une carte");
    expect(click).toHaveBeenCalled();

    await userEvent.upload(
      input,
      new File(["png"], "carte.png", { type: "image/png" })
    );

    await waitFor(() => expect(reload).toHaveBeenCalled());
    const upload = api.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(upload[0]).toBe("/api/territoires/t1/carte");
    expect(upload[1]?.body).toBeInstanceOf(FormData);
    vi.unstubAllGlobals();
  });

  it("journalise l'échec du téléversement et ignore une sélection vide", async () => {
    setup({ "POST /api/territoires/t1/carte": jsonResponse({}, 413) });
    const { container } = renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />
    );
    const input = container.querySelector(
      "input[type=file]"
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [] } });
    await userEvent.upload(
      input,
      new File(["png"], "carte.png", { type: "image/png" })
    );

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "❌ Erreur lors du téléchargement de la carte du territoire"
      )
    );

    api.mockRejectedValueOnce(new Error("réseau"));
    await userEvent.upload(
      input,
      new File(["png"], "carte2.png", { type: "image/png" })
    );
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "❌ Erreur lors du téléchargement de la carte du territoire:",
        expect.any(Error)
      )
    );
  });

  it("ouvre la carte du territoire dans un nouvel onglet", async () => {
    setup();
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    URL.createObjectURL = vi.fn(() => "blob:carte");
    URL.revokeObjectURL = vi.fn();
    renderWithStore(
      <TerritoryDataActionButtons
        territoryId="t1"
        status="AVAILABLE"
        territoryMapId="t1"
      />
    );

    await chooseInMenu("Voir la carte");

    await waitFor(() =>
      expect(open).toHaveBeenCalledWith("blob:carte", "_blank")
    );
    // Une carte existe déjà : l'import la remplace
    await openMenu();
    expect(
      screen.getByRole("menuitem", { name: "Remplacer la carte" })
    ).toBeInTheDocument();
  });

  it("journalise l'échec de l'ouverture de la carte", async () => {
    setup({ "GET /api/territoires/t1/carte": jsonResponse({}, 404) });
    renderWithStore(
      <TerritoryDataActionButtons
        territoryId="t1"
        status="AVAILABLE"
        territoryMapId="t1"
      />
    );

    await chooseInMenu("Voir la carte");
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "❌ Erreur lors de la récupération de la carte du territoire"
      )
    );

    api.mockRejectedValueOnce(new Error("réseau"));
    await chooseInMenu("Voir la carte");
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "❌ Erreur lors de la récupération de la carte du territoire:",
        expect.any(Error)
      )
    );
  });

  it("affiche le chargement ou l'erreur de la liste des personnes", () => {
    setup();
    const { unmount } = renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />,
      "ADMIN",
      {
        persons: { loading: true, isFetchingPersons: true },
      }
    );
    expect(screen.getByText("Chargement des personnes...")).toBeInTheDocument();
    unmount();

    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />,
      "ADMIN",
      {
        persons: { error: "Serveur indisponible", persons: persons as never },
      }
    );
    expect(
      screen.getByText("Erreur : Serveur indisponible")
    ).toBeInTheDocument();
  });
});

describe("Dialogue d'attribution", () => {
  const renderDialog = () => {
    const onAssign = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AssignTerritoryDialog
        isOpen
        onOpenChange={onOpenChange}
        people={persons}
        onAssign={onAssign}
      />
    );
    return { onAssign, onOpenChange };
  };

  it.each([
    ["", "", "Sélectionnez une personne ou entrez un prénom et un nom"],
    ["Paul", "", "Le nom est requis"],
    ["", "Durand", "Le prénom est requis"],
  ])(
    "exige une personne ou un nom complet (prénom %j, nom %j)",
    async (firstName, lastName, message) => {
      const { onAssign } = renderDialog();

      if (firstName)
        await userEvent.type(screen.getByPlaceholderText("Prénom"), firstName);
      if (lastName)
        await userEvent.type(screen.getByPlaceholderText("Nom"), lastName);
      await userEvent.click(screen.getByText("Confirmer l'assignation"));

      expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
      expect(onAssign).not.toHaveBeenCalled();
    }
  );

  it("désactive la saisie d'une nouvelle personne quand une personne est choisie, puis la réactive", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByText("Jean Dupont"));
    expect(screen.getByRole("combobox")).toHaveTextContent("Jean Dupont");
    expect(screen.getByPlaceholderText("Prénom")).toBeDisabled();

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByText("Aucune personne"));
    expect(screen.getByPlaceholderText("Prénom")).toBeEnabled();
  });
});

describe("Dialogue de prolongation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockApi({
      "GET /api/settings/durees": {
        assignmentDurationMonths: 4,
        pendingDurationMonths: 4,
      },
    });
  });

  const renderDialog = () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ExtendConfirmationDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );
    return { onConfirm, onClose };
  };

  it.each([
    ["1 mois", format(addMonths(new Date(), 1), "yyyy-MM-dd")],
    ["1 semaine", format(addWeeks(new Date(), 1), "yyyy-MM-dd")],
  ])("prolonge de %s", async (label, expected) => {
    const { onConfirm } = renderDialog();

    await userEvent.click(screen.getByLabelText(label));
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(onConfirm).toHaveBeenCalledWith(expected);
  });

  it("propose par défaut la durée d'attribution des paramètres", async () => {
    mockApi({
      "GET /api/settings/durees": {
        assignmentDurationMonths: 3,
        pendingDurationMonths: 4,
      },
    });
    const { onConfirm } = renderDialog();

    expect(await screen.findByLabelText("3 mois")).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(onConfirm).toHaveBeenCalledWith(
      format(addMonths(new Date(), 3), "yyyy-MM-dd")
    );
  });

  it("exige une date pour une prolongation personnalisée", async () => {
    const { onConfirm } = renderDialog();

    await userEvent.click(screen.getByLabelText("Personnalisé"));
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeDisabled();

    await userEvent.click(screen.getByText("Sélectionner une date"));
    const days = (await screen.findAllByRole("button")).filter(
      (b) => /^\d+$/.test(b.textContent ?? "") && !b.hasAttribute("disabled")
    );
    await userEvent.click(days.at(-1)!);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
  });

  it("se ferme sans prolonger", async () => {
    const { onClose, onConfirm } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
