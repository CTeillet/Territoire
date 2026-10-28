import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublishersCountSection } from "@/components/parameters/other-parameter/publishers-count-section";
import { ExportExcelButton } from "@/components/parameters/other-parameter/export-excel-button";
import { ImportExcelSection } from "@/components/parameters/other-parameter/import-excel-section";
import { CheckLateTerritoriesButton } from "@/components/parameters/other-parameter/check-late-territories-button";
import { CheckAvailableTerritoriesButton } from "@/components/parameters/other-parameter/check-available-territories-button";
import { LateReminderMessage } from "@/components/parameters/other-parameter/late-reminder-message";
import { ExportTerritoriesMapButton } from "@/components/parameters/other-parameter/export-map-button";
import OtherParameter from "@/components/parameters/other-parameter/other-parameter";
import { DurationsSection } from "@/components/parameters/other-parameter/durations-section";
import { toast } from "sonner";
import * as authFetchModule from "@/utils/auth-fetch";
import { jsonResponse, mockApi, renderWithRole } from "../test-utils";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const networkError = () => {
  throw new TypeError("Failed to fetch");
};

/** Téléchargements déclenchés par un lien <a download> (le clic est intercepté). */
let downloads: string[];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  Object.values(toast).forEach((fn) => vi.mocked(fn).mockClear());
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 11, 12));
  downloads = [];
  URL.createObjectURL = vi.fn(() => "blob:fichier");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    downloads.push(this.download);
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PublishersCountSection", () => {
  it("charge puis enregistre le nombre de proclamateurs", async () => {
    const api = mockApi({
      "GET /api/settings/publishers-count": 42,
      "PUT /api/settings/publishers-count": null,
    });
    render(<PublishersCountSection />);
    const input = screen.getByLabelText("Nombre de proclamateurs");
    await waitFor(() => expect(input).toHaveValue(42));

    fireEvent.change(input, { target: { value: "50" } });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Nombre de proclamateurs enregistré"
      )
    );
    expect(api).toHaveBeenCalledWith(
      "/api/settings/publishers-count",
      expect.objectContaining({ method: "PUT", body: "50" })
    );
  });

  it("affiche 0 si la valeur stockée n'est pas un nombre et ignore une erreur de chargement", async () => {
    mockApi({ "GET /api/settings/publishers-count": null });
    const { unmount } = render(<PublishersCountSection />);
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre de proclamateurs")).toHaveValue(0)
    );
    unmount();

    mockApi({ "GET /api/settings/publishers-count": networkError });
    render(<PublishersCountSection />);
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.getByLabelText("Nombre de proclamateurs")).toHaveValue(null);
  });

  it("refuse une valeur vide sans appeler le serveur", async () => {
    const api = mockApi({ "GET /api/settings/publishers-count": 42 });
    render(<PublishersCountSection />);
    const input = screen.getByLabelText("Nombre de proclamateurs");
    await waitFor(() => expect(input).toHaveValue(42));

    fireEvent.change(input, { target: { value: "" } });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(toast.error).toHaveBeenCalledWith(
      "Veuillez saisir un nombre valide de proclamateurs"
    );
    expect(api).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "un refus du serveur",
      jsonResponse({}, 500),
      "Échec de l'enregistrement du nombre de proclamateurs",
    ],
    ["une erreur réseau", networkError, "Erreur lors de l'enregistrement"],
  ])("signale %s", async (_, put, message) => {
    mockApi({
      "GET /api/settings/publishers-count": 42,
      "PUT /api/settings/publishers-count": put,
    });
    render(<PublishersCountSection />);
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre de proclamateurs")).toHaveValue(42)
    );

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  });
});

describe("ExportExcelButton", () => {
  it("propose l'année scolaire en cours (à partir de septembre)", () => {
    render(<ExportExcelButton />);
    expect(screen.getByLabelText("Année scolaire (début):")).toHaveValue(2026);
    expect(screen.getByText("2026 - 2027")).toBeInTheDocument();
  });

  it("propose l'année scolaire précédente avant septembre", () => {
    vi.setSystemTime(new Date(2026, 2, 1));
    render(<ExportExcelButton showTitle={false} />);
    expect(screen.getByLabelText("Année scolaire (début):")).toHaveValue(2025);
    expect(
      screen.queryByRole("heading", { name: "Exporter" })
    ).not.toBeInTheDocument();
  });

  it("télécharge le S-13 de l'année choisie", async () => {
    const api = mockApi({ "GET /api/excel": jsonResponse("xlsx") });
    render(<ExportExcelButton />);

    fireEvent.change(screen.getByLabelText("Année scolaire (début):"), {
      target: { value: "2024" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Exporter en Excel" })
    );

    await waitFor(() =>
      expect(downloads).toEqual(["S-13_2024-2025_2026-10-11.xlsx"])
    );
    expect(api).toHaveBeenCalledWith("/api/excel?year=2024");
  });

  it("ne télécharge pas le message d'erreur comme fichier Excel", async () => {
    mockApi({ "GET /api/excel": jsonResponse({ error: "boom" }, 500) });
    render(<ExportExcelButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "Exporter en Excel" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Échec de l'export Excel")
    );
    expect(downloads).toEqual([]);
  });

  it("journalise une erreur réseau", async () => {
    mockApi({ "GET /api/excel": networkError });
    render(<ExportExcelButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "Exporter en Excel" })
    );

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Erreur lors du téléchargement :",
        expect.any(TypeError)
      )
    );
  });
});

describe("ImportExcelSection", () => {
  const file = new File(["contenu"], "territoires.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const upload = async () => {
    const { container } = render(<ImportExcelSection />);
    const button = screen.getByRole("button", {
      name: "Importer un fichier Excel",
    });
    expect(button).toBeDisabled();
    await userEvent.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      file
    );
    await userEvent.click(button);
  };

  it("envoie le fichier choisi et affiche le résultat", async () => {
    const api = mockApi({
      "POST /api/excel": jsonResponse("12 territoires importés"),
    });

    await upload();

    expect(
      await screen.findByText("✅ 12 territoires importés")
    ).toBeInTheDocument();
    const body = api.mock.calls[0][1]?.body as FormData;
    expect((body.get("file") as File).name).toBe("territoires.xlsx");
  });

  it("affiche l'erreur renvoyée par le serveur", async () => {
    mockApi({ "POST /api/excel": jsonResponse("Feuille manquante", 400) });

    await upload();

    expect(
      await screen.findByText("❌ Erreur : Feuille manquante")
    ).toBeInTheDocument();
  });

  it("signale une erreur réseau", async () => {
    mockApi({ "POST /api/excel": networkError });

    await upload();

    expect(
      await screen.findByText("❌ Erreur réseau ou serveur.")
    ).toBeInTheDocument();
  });
});

describe("Boutons de vérification", () => {
  it.each([
    [
      CheckLateTerritoriesButton,
      "Vérification des retards",
      "PUT /api/attributions/verification-retard",
      "Vérification des retards terminée !",
      "Erreur lors de la vérification des retards.",
    ],
    [
      CheckAvailableTerritoriesButton,
      "Vérification des territoires en attente",
      "PUT /api/territoires/verification-disponible",
      "Vérification des territoires en attente terminée !",
      "Erreur lors de la vérification des territoires en attente.",
    ],
  ])(
    "%o : succès, refus et erreur réseau",
    async (Component, label, route, success, failure) => {
      const api = mockApi({ [route]: null });
      const { unmount } = render(<Component />);
      await userEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith(success));
      expect(api).toHaveBeenCalledWith(route.slice(4), { method: "PUT" });
      unmount();

      mockApi({ [route]: jsonResponse({}, 500) });
      const second = render(<Component showTitle={false} />);
      expect(
        screen.queryByRole("heading", { name: "Vérifications" })
      ).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(failure));
      second.unmount();

      vi.mocked(toast.error).mockClear();
      mockApi({ [route]: networkError });
      render(<Component />);
      await userEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(failure));
    }
  );
});

describe("LateReminderMessage (cas d'erreur et copie)", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  it.each([
    [
      "un refus",
      jsonResponse({}, 500),
      "Impossible de charger le message de relance",
    ],
    ["une erreur réseau", networkError, "Erreur réseau lors du chargement"],
  ])("signale %s au chargement", async (_, response, message) => {
    mockApi({ "GET /api/settings/late-reminder-message": response });
    render(<LateReminderMessage />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
    expect(
      screen.getByRole("button", { name: "Copier le message" })
    ).toBeDisabled();
  });

  it("copie le message dans le presse-papiers", async () => {
    mockApi({
      "GET /api/settings/late-reminder-message": jsonResponse("Bonjour"),
    });
    render(<LateReminderMessage showTitle={false} />);
    await screen.findByDisplayValue("Bonjour");

    writeText.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Copier le message" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Message copié dans le presse-papiers"
      )
    );
    expect(writeText).toHaveBeenCalledWith("Bonjour");

    writeText.mockRejectedValueOnce(new Error("refusé"));
    fireEvent.click(screen.getByRole("button", { name: "Copier le message" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Impossible de copier le message"
      )
    );
  });

  it.each([
    ["un refus", jsonResponse({}, 500), "Échec de l'enregistrement du message"],
    [
      "une erreur réseau",
      networkError,
      "Erreur réseau lors de l'enregistrement",
    ],
  ])("signale %s à l'enregistrement", async (_, response, message) => {
    mockApi({
      "GET /api/settings/late-reminder-message": jsonResponse("Bonjour"),
      "PUT /api/settings/late-reminder-message": response,
    });
    render(<LateReminderMessage />);
    await screen.findByDisplayValue("Bonjour");

    await userEvent.click(screen.getByRole("button", { name: "Sauvegarder" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
    expect(screen.getByRole("button", { name: "Sauvegarder" })).toBeEnabled();
  });
});

describe("ExportTerritoriesMapButton", () => {
  const png = jsonResponse("png");

  it("exporte la carte avec les options par défaut", async () => {
    const api = mockApi({ "GET /api/exports/territories.png": png });
    render(<ExportTerritoriesMapButton />);
    expect(
      screen.getByText("territoires_A3_landscape_300dpi_z14_2026-10-11.png")
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Exporter la carte" })
    );

    await waitFor(() =>
      expect(downloads).toEqual([
        "territoires_A3_landscape_300dpi_z14_2026-10-11.png",
      ])
    );
    expect(api).toHaveBeenCalledWith(
      "/api/exports/territories.png?paper=A3&orientation=landscape&dpi=300&zoom=14&showLabels=true"
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fichier");
    expect(
      screen.getByRole("button", { name: "Exporter la carte" })
    ).toBeEnabled();
  });

  it("applique les options choisies", async () => {
    const api = mockApi({ "GET /api/exports/territories.png": png });
    render(<ExportTerritoriesMapButton showTitle={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("combobox", { name: "Format" })
    );
    await userEvent.click(await screen.findByRole("option", { name: "A4" }));
    await userEvent.click(
      within(dialog).getByRole("combobox", { name: "Orientation" })
    );
    await userEvent.click(
      await screen.findByRole("option", { name: "Portrait" })
    );
    fireEvent.change(within(dialog).getByLabelText("DPI"), {
      target: { value: "150" },
    });
    fireEvent.change(within(dialog).getByLabelText("Zoom tuiles"), {
      target: { value: "16" },
    });
    await userEvent.click(
      within(dialog).getByLabelText("Afficher les étiquettes")
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Lancer l’export" })
    );

    await waitFor(() =>
      expect(downloads).toEqual([
        "territoires_A4_portrait_150dpi_z16_2026-10-11.png",
      ])
    );
    expect(api).toHaveBeenCalledWith(
      "/api/exports/territories.png?paper=A4&orientation=portrait&dpi=150&zoom=16&showLabels=false"
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("revient aux valeurs par défaut si le DPI ou le zoom est vidé, et ferme sur Annuler", async () => {
    render(<ExportTerritoriesMapButton />);

    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("DPI"), {
      target: { value: "" },
    });
    fireEvent.change(within(dialog).getByLabelText("Zoom tuiles"), {
      target: { value: "" },
    });
    expect(within(dialog).getByLabelText("DPI")).toHaveValue(300);
    expect(within(dialog).getByLabelText("Zoom tuiles")).toHaveValue(14);

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Annuler" })
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("filtre sur une ville", async () => {
    const api = mockApi({ "GET /api/exports/territories.png": png });
    render(<ExportTerritoriesMapButton cityId="12345678-aaaa-bbbb" />);

    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    expect(
      within(await screen.findByRole("dialog")).getByText(/12345678-aaaa-bbbb/)
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Lancer l’export" })
    );

    await waitFor(() =>
      expect(downloads).toEqual([
        "territoires_A3_landscape_300dpi_z14_city-12345678_2026-10-11.png",
      ])
    );
    expect(api.mock.calls[0][0]).toContain("cityId=12345678-aaaa-bbbb");
  });

  it("affiche le motif du refus renvoyé par le serveur", async () => {
    mockApi({
      "GET /api/exports/territories.png": jsonResponse(
        { error: "Le DPI doit être compris entre 72 et 600" },
        400
      ),
    });
    render(<ExportTerritoriesMapButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "Exporter la carte" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Échec de l'export : Le DPI doit être compris entre 72 et 600"
      )
    );
    expect(downloads).toEqual([]);
  });

  it("indique le code HTTP quand la réponse n'est pas du JSON", async () => {
    mockApi({
      "GET /api/exports/territories.png": {
        ok: false,
        status: 502,
        json: async () => JSON.parse("<html>"),
      } as Response,
    });
    render(<ExportTerritoriesMapButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "Exporter la carte" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Échec de l'export : échec du rendu (HTTP 502)"
      )
    );
  });

  it("affiche l'état de génération", async () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(authFetchModule, "authFetch").mockReturnValue(
      new Promise<Response>((r) => (resolve = r))
    );
    render(<ExportTerritoriesMapButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "Exporter la carte" })
    );

    expect(
      await screen.findByRole("button", { name: "Génération…" })
    ).toBeDisabled();
    resolve(png);
    expect(
      await screen.findByRole("button", { name: "Exporter la carte" })
    ).toBeEnabled();
  });
});

describe("DurationsSection", () => {
  const durations = { assignmentDurationMonths: 4, pendingDurationMonths: 4 };

  it("charge puis enregistre les durées", async () => {
    const api = mockApi({
      "GET /api/settings/durees": durations,
      "PUT /api/settings/durees": {
        assignmentDurationMonths: 3,
        pendingDurationMonths: 6,
      },
    });
    render(<DurationsSection />);

    const assignment = screen.getByLabelText("Durée d'attribution (mois)");
    await waitFor(() => expect(assignment).toHaveValue(4));
    const save = screen.getByRole("button", { name: "Enregistrer" });
    // Rien à enregistrer tant que les valeurs n'ont pas changé
    expect(save).toBeDisabled();

    fireEvent.change(assignment, { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Durée d'attente (mois)"), {
      target: { value: "6" },
    });
    await userEvent.click(save);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Durées enregistrées")
    );
    expect(api).toHaveBeenCalledWith(
      "/api/settings/durees",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          assignmentDurationMonths: 3,
          pendingDurationMonths: 6,
        }),
      })
    );
    expect(save).toBeDisabled();
  });

  it("refuse une durée hors bornes et signale les erreurs de l'API", async () => {
    mockApi({
      "GET /api/settings/durees": durations,
      "PUT /api/settings/durees": jsonResponse({ error: "Accès refusé" }, 403),
    });
    render(<DurationsSection />);
    const pending = screen.getByLabelText("Durée d'attente (mois)");
    await waitFor(() => expect(pending).toHaveValue(4));

    fireEvent.change(pending, { target: { value: "0" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Chaque durée doit être un nombre entier de mois entre 1 et 24."
    );
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

    fireEvent.change(pending, { target: { value: "5" } });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Accès refusé")
    );
  });

  it("signale l'échec du chargement", async () => {
    mockApi({ "GET /api/settings/durees": networkError });
    render(<DurationsSection />);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByLabelText("Durée d'attribution (mois)")).toBeDisabled();
  });
});

describe("OtherParameter", () => {
  it("regroupe toutes les sections", () => {
    mockApi({
      "GET /api/settings/durees": {
        assignmentDurationMonths: 4,
        pendingDurationMonths: 4,
      },
      "GET /api/settings/late-reminder-message": jsonResponse(""),
      "GET /api/settings/recapitulatif-retards": {
        recipients: [],
        mailConfigured: true,
      },
      "GET /api/personnes": [],
    });
    renderWithRole(<OtherParameter />, "ADMIN");

    for (const title of [
      "Paramètres généraux",
      "Durées",
      "Données Excel",
      "Vérifications",
      "Messages types",
      "Récapitulatif des retards par e-mail",
      "Test WhatsApp",
      "Export cartographique",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("réserve le test WhatsApp à l'administrateur", () => {
    mockApi({
      "GET /api/settings/late-reminder-message": jsonResponse(""),
      "GET /api/settings/recapitulatif-retards": {
        recipients: [],
        mailConfigured: true,
      },
    });
    renderWithRole(<OtherParameter />, "SUPERVISEUR");

    expect(
      screen.getByRole("heading", { name: "Messages types" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Récapitulatif des retards par e-mail",
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Test WhatsApp" })
    ).not.toBeInTheDocument();
  });

  it("réserve le récapitulatif des retards aux administrateurs et superviseurs", () => {
    mockApi({ "GET /api/settings/late-reminder-message": jsonResponse("") });
    renderWithRole(<OtherParameter />, "GESTIONNAIRE");

    for (const title of ["Récapitulatif des retards par e-mail", "Durées"]) {
      expect(
        screen.queryByRole("heading", { name: title })
      ).not.toBeInTheDocument();
    }
  });
});
