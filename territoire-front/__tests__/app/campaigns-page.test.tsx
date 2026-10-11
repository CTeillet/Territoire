import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CampaignsPage from "@/app/(app)/campagnes/page";
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog";
import { toast } from "sonner";
import { jsonResponse, mockApi, renderWithStore } from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const campaign = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "Campagne d'automne",
  startDate: "2026-09-01",
  endDate: "2026-10-31",
  closed: false,
  territories: [
    { territoryId: "t1" },
    { territoryId: "t2" },
    { territoryId: "t3" },
  ],
  remainingTerritories: [{ territoryId: "t3" }],
  ...overrides,
});

describe("Page des campagnes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    push.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("liste les campagnes avec leur statut et leur avancement", async () => {
    mockApi({
      "GET /api/campagnes": [
        campaign(),
        campaign({
          id: "c2",
          name: "Campagne de printemps",
          closed: true,
          endDate: null,
        }),
      ],
    });
    renderWithStore(<CampaignsPage />);

    expect(await screen.findByText("Campagne d'automne")).toBeInTheDocument();
    expect(screen.getByText("En cours")).toBeInTheDocument();
    expect(screen.getByText("Terminée")).toBeInTheDocument();
    expect(screen.getByText("3 territoires (2 utilisés)")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();

    await userEvent.click(screen.getAllByText("Détails")[1]);
    expect(push).toHaveBeenCalledWith("/campagnes/c2");
  });

  it("propose de créer une première campagne quand il n'y en a aucune", async () => {
    mockApi({ "GET /api/campagnes": [] });
    renderWithStore(<CampaignsPage />);

    expect(
      await screen.findByText("Aucune campagne trouvée")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Nouvelle campagne")).toHaveLength(2);
  });

  it("ne propose pas la création à un simple utilisateur", async () => {
    mockApi({ "GET /api/campagnes": [] });
    renderWithStore(<CampaignsPage />, "UTILISATEUR");

    expect(
      await screen.findByText("Aucune campagne trouvée")
    ).toBeInTheDocument();
    expect(screen.queryByText("Nouvelle campagne")).not.toBeInTheDocument();
  });
});

describe("Création d'une campagne", () => {
  let api: ReturnType<typeof mockApi>;

  const open = async (campaigns: unknown[] = []) => {
    api = mockApi({
      "GET /api/campagnes": campaigns,
      "POST /api/campagnes": campaign({ id: "nouvelle" }),
      "POST /api/campagnes/avec-territoires-restants": campaign({
        id: "suite",
      }),
    });
    const onCampaignCreated = vi.fn();
    renderWithStore(
      <CreateCampaignDialog onCampaignCreated={onCampaignCreated} />
    );
    await userEvent.click(screen.getByText("Nouvelle campagne"));
    return { onCampaignCreated, dialog: await screen.findByRole("dialog") };
  };

  const fill = async (name: string, start: string, end: string) => {
    if (name)
      await userEvent.type(screen.getByLabelText("Nom de la campagne"), name);
    if (start)
      fireEvent.change(screen.getByLabelText("Date de début"), {
        target: { value: start },
      });
    if (end)
      fireEvent.change(screen.getByLabelText("Date de fin"), {
        target: { value: end },
      });
  };

  const submit = (dialog: HTMLElement) =>
    fireEvent.submit(dialog.querySelector("form")!);

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    push.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it.each([
    ["", "", "", "Le nom de la campagne est requis"],
    ["Été", "", "", "La date de début est requise"],
    ["Été", "2026-06-01", "", "La date de fin est requise"],
    [
      "Été",
      "2026-06-01",
      "2026-05-01",
      "La date de fin doit être après la date de début",
    ],
  ])(
    "valide le formulaire (nom %j, début %j, fin %j)",
    async (name, start, end, message) => {
      const { dialog } = await open();

      await fill(name, start, end);
      submit(dialog);

      expect(toast.error).toHaveBeenCalledWith(message);
      expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
        false
      );
    }
  );

  it("crée la campagne puis ouvre son détail", async () => {
    const { dialog, onCampaignCreated } = await open();

    await fill("Été", "2026-06-01", "2026-08-31");
    await userEvent.type(
      screen.getByLabelText("Description (optionnelle)"),
      "Invitations"
    );
    submit(dialog);

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/campagnes/nouvelle")
    );
    expect(toast.success).toHaveBeenCalledWith(
      'La campagne "Été" a été créée avec succès.'
    );
    expect(onCampaignCreated).toHaveBeenCalled();
    const post = api.mock.calls.find(
      ([url, init]) => url === "/api/campagnes" && init?.method === "POST"
    )!;
    expect(JSON.parse(String(post[1]?.body))).toEqual({
      name: "Été",
      description: "Invitations",
      startDate: "2026-06-01",
      endDate: "2026-08-31",
    });
  });

  it("reprend les territoires restants d'une campagne clôturée", async () => {
    const { dialog } = await open([
      campaign({ id: "ancienne", name: "Printemps", closed: true }),
      campaign({
        id: "vide",
        name: "Sans reste",
        closed: true,
        remainingTerritories: [],
      }),
    ]);

    await userEvent.click(await within(dialog).findByRole("combobox"));
    expect(screen.queryByText(/Sans reste/)).not.toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole("option", { name: "Printemps (1 territoires)" })
    );
    await fill("Suite", "2026-06-01", "2026-08-31");
    submit(dialog);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/campagnes/suite"));
    expect(api).toHaveBeenCalledWith(
      "/api/campagnes/avec-territoires-restants/ancienne",
      expect.objectContaining({ method: "POST" })
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("avec les territoires restants")
    );
  });

  it("revient à aucune campagne précédente", async () => {
    const { dialog } = await open([
      campaign({ id: "ancienne", name: "Printemps", closed: true }),
    ]);

    await userEvent.click(await within(dialog).findByRole("combobox"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Printemps (1 territoires)" })
    );
    await userEvent.click(within(dialog).getByRole("combobox"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Aucune campagne précédente" })
    );
    await fill("Été", "2026-06-01", "2026-08-31");
    submit(dialog);

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/campagnes/nouvelle")
    );
  });

  it("signale l'échec de la création", async () => {
    const { dialog } = await open();
    api.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "POST" ? jsonResponse({}, 500) : jsonResponse([])
    );

    await fill("Été", "2026-06-01", "2026-08-31");
    submit(dialog);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Une erreur est survenue lors de la création de la campagne"
      )
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("se ferme sans rien créer", async () => {
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});
