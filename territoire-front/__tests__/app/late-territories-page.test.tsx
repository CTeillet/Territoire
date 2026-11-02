import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LateTerritoriesPage from "@/app/(app)/territoires/retards/page";
import { toast } from "sonner";
import { mockApi, renderWithStore, jsonResponse } from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const feature = (
  id: string,
  name: string,
  status: string,
  assignedTo: string,
  waitedFor = "2026-05-01"
) => ({
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: {
    id,
    name,
    status,
    city: "Rennes",
    assignedTo,
    assignedOn: "2026-01-01",
    waitedFor,
  },
});

const geojson = {
  type: "FeatureCollection",
  features: [
    feature("t1", "R-12", "LATE", "Jean Dupont", "2026-05-01"),
    feature("t2", "R-13", "LATE", "jean dupont", "2026-03-01"),
    feature("t3", "R-14", "LATE", "Personne Inconnue"),
    feature("t4", "R-15", "AVAILABLE", "N/A"),
  ],
};

// Rappel envoyé pendant l'attribution en cours (territoires attribués le 1er janvier)
const remindedOn = "2026-02-01";

const persons = [
  {
    id: "p1",
    firstName: "JEAN",
    lastName: "Dupont",
    phoneNumber: "+33600000000",
  },
];

describe("Page des territoires en retard", () => {
  let api: ReturnType<typeof mockApi>;

  const setup = (
    reminders: unknown[] = [],
    extra: Record<string, unknown> = {}
  ) => {
    api = mockApi({
      "GET /api/territoires/geojson": geojson,
      "GET /api/territory-reminders": reminders,
      "GET /api/personnes": persons,
      "GET /api/settings/late-reminder-message": "Salut {{ person.firstName }}",
      "POST /api/territory-reminders": { id: "r1" },
      "POST /api/territory-reminders/whatsapp": { id: "r2" },
      ...extra,
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    push.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.info).mockClear();
    localStorage.clear();
  });

  it("regroupe les territoires en retard par personne (nom retrouvé sans tenir compte de la casse)", async () => {
    setup();
    renderWithStore(<LateTerritoriesPage />);

    expect(await screen.findByText("JEAN Dupont")).toBeInTheDocument();
    expect(screen.getByText("2 territoire(s)")).toBeInTheDocument();
    // Personne absente de la liste : groupe sous son nom
    expect(screen.getByText("Personne Inconnue")).toBeInTheDocument();
    expect(screen.getByText("1 territoire(s)")).toBeInTheDocument();
    // Plus ancien retard du groupe de Jean : 1er mars
    expect(screen.getByText(/01 mars 2026/)).toBeInTheDocument();
    expect(screen.queryByText("R-15")).not.toBeInTheDocument();
  });

  it("propose la fiche de la personne seulement quand elle est connue", async () => {
    setup();
    renderWithStore(<LateTerritoriesPage />);

    const header = (await screen.findByText("JEAN Dupont")).closest(
      "div.border"
    )! as HTMLElement;
    expect(
      within(header).getByRole("link", {
        name: "Voir la fiche de la personne",
      })
    ).toHaveAttribute("href", "/personnes/p1");
    // Nom sans personne correspondante : aucune fiche vers laquelle renvoyer
    const unknown = screen
      .getByText("Personne Inconnue")
      .closest("div.border")! as HTMLElement;
    expect(within(unknown).queryByRole("link")).not.toBeInTheDocument();
  });

  it("déplie un groupe pour voir le détail de ses territoires", async () => {
    setup([
      {
        id: "r0",
        personId: "p1",
        territoryIds: ["t1"],
        reminderDate: remindedOn,
      },
    ]);
    renderWithStore(<LateTerritoriesPage />);

    const header = (await screen.findByText("JEAN Dupont")).closest(
      "div.border"
    )! as HTMLElement;
    await userEvent.click(
      within(header).getByRole("button", { name: "Déplier le groupe" })
    );

    expect(await within(header).findByText("R-12")).toBeInTheDocument();
    expect(within(header).getByText("R-13")).toBeInTheDocument();
    expect(within(header).getByText("Rappel envoyé")).toBeInTheDocument();
    expect(within(header).getByText("Pas de rappel")).toBeInTheDocument();

    await userEvent.click(
      within(header).getByRole("button", { name: "Replier le groupe" })
    );
    expect(within(header).queryByText("R-12")).not.toBeInTheDocument();
  });

  it("enregistre les rappels manuels des seuls territoires non rappelés", async () => {
    setup([
      {
        id: "r0",
        personId: "p1",
        territoryIds: ["t1"],
        reminderDate: remindedOn,
      },
    ]);
    renderWithStore(<LateTerritoriesPage />);

    const header = (await screen.findByText("JEAN Dupont")).closest(
      "div.border"
    )! as HTMLElement;
    await userEvent.click(
      within(header).getByRole("button", { name: "Rappeler tout" })
    );
    await userEvent.click(await screen.findByText("Marquer rappels envoyés"));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Rappels enregistrés pour ce groupe"
      )
    );
    const posts = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts.map(([url]) => url)).toEqual([
      "/api/territory-reminders?territoryIds=t2&personId=p1",
    ]);
  });

  it("signale l'échec d'un rappel manuel", async () => {
    setup([], {
      "POST /api/territory-reminders": jsonResponse({ error: "Refusé" }, 400),
    });
    renderWithStore(<LateTerritoriesPage />);

    const header = (await screen.findByText("JEAN Dupont")).closest(
      "div.border"
    )! as HTMLElement;
    await userEvent.click(
      within(header).getByRole("button", { name: "Rappeler tout" })
    );
    await userEvent.click(await screen.findByText("Marquer rappels envoyés"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Refusé"));
  });

  it("envoie un rappel WhatsApp groupé pour tous les territoires de la personne", async () => {
    setup();
    renderWithStore(<LateTerritoriesPage />);

    const header = (await screen.findByText("JEAN Dupont")).closest(
      "div.border"
    )! as HTMLElement;
    await userEvent.click(
      within(header).getByRole("button", { name: "Rappeler tout" })
    );
    await screen.findByDisplayValue("Salut Jean");
    await userEvent.click(screen.getByText("Envoyer par WhatsApp"));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Messages WhatsApp envoyés et rappels enregistrés"
      )
    );
    const whatsapp = api.mock.calls.find(([url]) =>
      url.startsWith("/api/territory-reminders/whatsapp")
    )!;
    expect(whatsapp[0]).toBe(
      "/api/territory-reminders/whatsapp?territoryIds=t1,t2&personId=p1"
    );
    expect(whatsapp[1]).toEqual(
      expect.objectContaining({ method: "POST", body: "Salut Jean" })
    );
  });

  it("signale l'échec de l'envoi WhatsApp", async () => {
    setup([], {
      "POST /api/territory-reminders/whatsapp": jsonResponse(
        { error: "WAHA" },
        502
      ),
    });
    renderWithStore(<LateTerritoriesPage />);

    const header = (await screen.findByText("JEAN Dupont")).closest(
      "div.border"
    )! as HTMLElement;
    await userEvent.click(
      within(header).getByRole("button", { name: "Rappeler tout" })
    );
    await screen.findByDisplayValue("Salut Jean");
    await userEvent.click(screen.getByText("Envoyer par WhatsApp"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Certains envois ont échoué (1)")
    );
  });

  it("désactive « Rappeler tout » quand tous les territoires ont déjà un rappel", async () => {
    setup([
      {
        id: "r1",
        personId: "p1",
        territoryIds: ["t1"],
        reminderDate: remindedOn,
      },
      // Ancien format : un seul territoire par rappel
      { id: "r2", personId: "p1", territoryId: "t2", reminderDate: remindedOn },
      // Personne inconnue : rapprochement par le nom
      {
        id: "r3",
        personName: "personne inconnue",
        territoryIds: ["t3"],
        reminderDate: remindedOn,
      },
    ]);
    renderWithStore(<LateTerritoriesPage />);

    const header = (await screen.findByText("JEAN Dupont")).closest(
      "div.border"
    )! as HTMLElement;
    expect(
      within(header).getByRole("button", { name: "Rappeler tout" })
    ).toBeDisabled();
    const unknown = screen
      .getByText("Personne Inconnue")
      .closest("div.border")! as HTMLElement;
    expect(
      within(unknown).getByRole("button", { name: "Rappeler tout" })
    ).toBeDisabled();
  });

  it("ignore les rappels des attributions précédentes, même du jour de la prolongation", async () => {
    setup([
      // Avant l'attribution en cours
      {
        id: "r1",
        personId: "p1",
        territoryIds: ["t1"],
        reminderDate: "2025-12-15",
      },
      // Jour de la prolongation : le rappel concerne l'attribution close ce jour-là
      {
        id: "r2",
        personId: "p1",
        territoryIds: ["t1", "t2"],
        reminderDate: "2026-01-01",
      },
    ]);
    renderWithStore(<LateTerritoriesPage />);

    const header = (await screen.findByText("JEAN Dupont")).closest(
      "div.border"
    )! as HTMLElement;
    const remindAll = within(header).getByRole("button", {
      name: "Rappeler tout",
    });
    expect(remindAll).toBeEnabled();
    await userEvent.click(
      within(header).getByRole("button", { name: "Déplier le groupe" })
    );
    expect(await within(header).findAllByText("Pas de rappel")).toHaveLength(2);
    expect(within(header).queryByText("Rappel envoyé")).not.toBeInTheDocument();

    await userEvent.click(remindAll);
    await userEvent.click(await screen.findByText("Marquer rappels envoyés"));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Rappels enregistrés pour ce groupe"
      )
    );
    const posts = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts.map(([url]) => url)).toEqual([
      "/api/territory-reminders?territoryIds=t1&personId=p1",
      "/api/territory-reminders?territoryIds=t2&personId=p1",
    ]);
  });

  describe("tri des groupes", () => {
    // Jean Dupont : 2 territoires, plus ancien retard le 1er mars
    // Personne Inconnue : 1 territoire, retard le 1er mai
    const groupOrder = () =>
      screen
        .getAllByText(/^(JEAN Dupont|Personne Inconnue)$/)
        .map((el) => el.textContent);

    const chooseSort = async (label: string) => {
      await userEvent.click(
        screen.getByRole("combobox", { name: "Trier par" })
      );
      await userEvent.click(await screen.findByRole("option", { name: label }));
    };

    it("trie par nom par défaut", async () => {
      setup();
      renderWithStore(<LateTerritoriesPage />);

      await screen.findByText("JEAN Dupont");
      expect(
        screen.getByRole("combobox", { name: "Trier par" })
      ).toHaveTextContent("Nom (A → Z)");
      expect(groupOrder()).toEqual(["JEAN Dupont", "Personne Inconnue"]);
    });

    it.each([
      ["Nom (Z → A)", ["Personne Inconnue", "JEAN Dupont"]],
      ["Plus récent retard d'abord", ["Personne Inconnue", "JEAN Dupont"]],
      ["Plus ancien retard d'abord", ["JEAN Dupont", "Personne Inconnue"]],
      ["Plus de territoires d'abord", ["JEAN Dupont", "Personne Inconnue"]],
    ])("trie selon « %s »", async (label, expected) => {
      setup();
      renderWithStore(<LateTerritoriesPage />);
      await screen.findByText("JEAN Dupont");

      await chooseSort(label);

      await waitFor(() => expect(groupOrder()).toEqual(expected));
    });

    it("place en dernier les personnes déjà rappelées pour tout", async () => {
      setup([
        {
          id: "r1",
          personId: "p1",
          territoryIds: ["t1", "t2"],
          reminderDate: remindedOn,
        },
      ]);
      renderWithStore(<LateTerritoriesPage />);
      await screen.findByText("JEAN Dupont");

      await chooseSort("À rappeler d'abord");

      await waitFor(() =>
        expect(groupOrder()).toEqual(["Personne Inconnue", "JEAN Dupont"])
      );
    });

    it("retient le tri choisi pour la visite suivante", async () => {
      setup();
      const { unmount } = renderWithStore(<LateTerritoriesPage />);
      await screen.findByText("JEAN Dupont");
      await chooseSort("Nom (Z → A)");
      unmount();

      renderWithStore(<LateTerritoriesPage />);

      await screen.findByText("JEAN Dupont");
      expect(groupOrder()).toEqual(["Personne Inconnue", "JEAN Dupont"]);
    });
  });

  it("affiche l'état vide sans territoire en retard", async () => {
    setup();
    api.mockImplementation(async (url: string) =>
      url === "/api/territoires/geojson"
        ? jsonResponse({
            type: "FeatureCollection",
            features: [feature("t4", "R-15", "AVAILABLE", "N/A")],
          })
        : jsonResponse([])
    );
    renderWithStore(<LateTerritoriesPage />);

    expect(
      await screen.findByText("Aucun territoire en retard")
    ).toBeInTheDocument();
  });

  it("renvoie vers la connexion sans utilisateur connecté", async () => {
    setup();
    renderWithStore(<LateTerritoriesPage />, null);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
});
