import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TerritoryDataActionButtons } from "@/components/shared/territory-data-action-buttons";
import AssignTerritoryDialog from "@/components/territory/assign-territory-dialog";
import ExtendConfirmationDialog from "@/components/territory/extend-confirmation-dialog";
import { addMonths, addWeeks, format } from "date-fns";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";

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

    expect(
      screen.getByRole("link", { name: "Voir les détails" })
    ).toHaveAttribute("href", "/territoires/t1");
    expect(button("Assignation du territoire")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Retour du territoire dans le stock",
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Voir la carte du territoire" })
    ).not.toBeInTheDocument();
  });

  it("attribue le territoire à une personne existante", async () => {
    setup();
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />
    );
    await waitFor(() => expect(api).toHaveBeenCalledWith("/api/personnes"));

    await userEvent.click(button("Assignation du territoire"));
    await userEvent.click(await screen.findByRole("combobox"));
    await userEvent.click(await screen.findByText("Anne Martin"));
    await userEvent.click(screen.getByText("Confirmer l'assignation"));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/api/territoires/t1/attribuer/p2",
        expect.objectContaining({ method: "POST" })
      )
    );
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

    await userEvent.click(button("Assignation du territoire"));
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
    expect(
      screen.queryByRole("link", { name: "Voir les détails" })
    ).not.toBeInTheDocument();
  });

  it("n'attribue rien si la création de la personne échoue", async () => {
    setup({ "POST /api/personnes": jsonResponse({}, 500) });
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="AVAILABLE" />
    );

    await userEvent.click(button("Assignation du territoire"));
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

  it.each([
    ["Retour du territoire dans le stock", "/api/territoires/t1/retour"],
    ["Annuler l'assignation", "/api/territoires/t1/annuler-assignation"],
  ])("%s après confirmation", async (action, url) => {
    setup();
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="LATE" />
    );

    await userEvent.click(button(action));
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
      "Retour du territoire dans le stock",
      "POST /api/territoires/t1/retour",
      "❌ Erreur lors du retour du territoire :",
    ],
    [
      "Annuler l'assignation",
      "POST /api/territoires/t1/annuler-assignation",
      "❌ Erreur lors de l'annulation de l'assignation :",
    ],
    [
      "Prolongation du territoire",
      "POST /api/territoires/t1/prolongation",
      "❌ Erreur lors de la prolongation du territoire :",
    ],
  ])("%s : journalise l'échec", async (action, route, message) => {
    setup({ [route]: jsonResponse("refusé", 409) });
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="ASSIGNED" />
    );

    await userEvent.click(button(action));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Confirmer",
      })
    );

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(message, expect.anything())
    );
  });

  it("prolonge le territoire de la durée choisie", async () => {
    setup();
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="ASSIGNED" />
    );

    await userEvent.click(button("Prolongation du territoire"));
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

  it("masque les actions de gestion à un simple utilisateur", () => {
    setup();
    renderWithStore(
      <TerritoryDataActionButtons territoryId="t1" status="ASSIGNED" />,
      "UTILISATEUR"
    );

    expect(
      screen.queryByRole("button", {
        name: "Retour du territoire dans le stock",
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Télécharger une carte de territoire",
      })
    ).not.toBeInTheDocument();
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

    await userEvent.click(button("Télécharger une carte de territoire"));
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

    await userEvent.click(button("Voir la carte du territoire"));

    await waitFor(() =>
      expect(open).toHaveBeenCalledWith("blob:carte", "_blank")
    );
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

    await userEvent.click(button("Voir la carte du territoire"));
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "❌ Erreur lors de la récupération de la carte du territoire"
      )
    );

    api.mockRejectedValueOnce(new Error("réseau"));
    await userEvent.click(button("Voir la carte du territoire"));
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
