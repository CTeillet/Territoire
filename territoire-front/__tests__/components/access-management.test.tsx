import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessManagement, {
  canBeSent,
  matchesFilter,
} from "@/components/parameters/access/access-management";
import * as api from "@/lib/person-access-api";
import { AccessSettings, PersonAccessStatus } from "@/models/person-access";
import { toast } from "sonner";
import { renderWithRole } from "../test-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/person-access-api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/person-access-api")>();
  return {
    ...actual,
    fetchAllAccesses: vi.fn(),
    sendPersonAccess: vi.fn(),
    fetchAccessSettings: vi.fn(),
    saveAccessSettings: vi.fn(),
  };
});

const access = (
  overrides: Partial<PersonAccessStatus> = {}
): PersonAccessStatus => ({
  personId: "p1",
  personName: "Jean Dupont",
  hasPhone: true,
  status: "ACTIF",
  link: "https://tms.example/m/abc",
  expiresAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  lastUsedAt: null,
  lastSentAt: null,
  activeTerritories: 1,
  ...overrides,
});

const settings: AccessSettings = {
  assignmentNotificationEnabled: false,
  assignmentMessage: "Bonjour {{ person.firstName }} {{ link }}",
  accessLinkMessage: "Ton lien : {{ link }}",
  territoryRequestPhone: null,
};

describe("filtres des accès", () => {
  const now = Date.now();
  const recent = new Date(now - 24 * 3600 * 1000).toISOString();
  const old = new Date(now - 40 * 24 * 3600 * 1000).toISOString();

  it("filtre selon les territoires en cours", () => {
    expect(
      matchesFilter(access({ activeTerritories: 0 }), "WITH_TERRITORIES")
    ).toBe(false);
    expect(matchesFilter(access(), "WITH_TERRITORIES")).toBe(true);
    expect(matchesFilter(access({ activeTerritories: 0 }), "ALL")).toBe(true);
  });

  it("repère les liens jamais ouverts", () => {
    expect(matchesFilter(access(), "NEVER_OPENED")).toBe(true);
    expect(matchesFilter(access({ lastUsedAt: recent }), "NEVER_OPENED")).toBe(
      false
    );
    expect(matchesFilter(access({ status: "AUCUN" }), "NEVER_OPENED")).toBe(
      false
    );
  });

  it("repère les personnes sans lien actif", () => {
    expect(matchesFilter(access({ status: "REVOQUE" }), "NO_LINK")).toBe(true);
    expect(matchesFilter(access({ status: "AUCUN" }), "NO_LINK")).toBe(true);
    expect(matchesFilter(access(), "NO_LINK")).toBe(false);
  });

  it("repère les liens inactifs depuis 30 jours", () => {
    expect(matchesFilter(access({ lastUsedAt: old }), "INACTIVE")).toBe(true);
    expect(matchesFilter(access(), "INACTIVE")).toBe(true);
    expect(matchesFilter(access({ lastUsedAt: recent }), "INACTIVE")).toBe(
      false
    );
    expect(
      matchesFilter(access({ status: "EXPIRE", lastUsedAt: old }), "INACTIVE")
    ).toBe(false);
  });

  it("n'envoie qu'aux personnes avec un numéro et un lien envoyable", () => {
    expect(canBeSent(access())).toBe(true);
    expect(canBeSent(access({ status: "AUCUN" }))).toBe(true);
    expect(canBeSent(access({ hasPhone: false }))).toBe(false);
    expect(canBeSent(access({ status: "REVOQUE" }))).toBe(false);
    expect(canBeSent(access({ status: "EXPIRE" }))).toBe(false);
  });
});

describe("AccessManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchAccessSettings).mockResolvedValue(settings);
    vi.mocked(api.fetchAllAccesses).mockResolvedValue([
      access(),
      access({
        personId: "p2",
        personName: "Anne Martin",
        hasPhone: false,
        activeTerritories: 2,
      }),
      access({
        personId: "p3",
        personName: "Paul Sans Territoire",
        activeTerritories: 0,
      }),
    ]);
  });

  it("liste par défaut les personnes ayant un territoire en cours", async () => {
    renderWithRole(<AccessManagement />, "ADMIN");

    expect(await screen.findByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Anne Martin")).toBeInTheDocument();
    expect(screen.getByText("(sans numéro)")).toBeInTheDocument();
    expect(screen.queryByText("Paul Sans Territoire")).not.toBeInTheDocument();
  });

  it("envoie le lien d'une personne", async () => {
    vi.mocked(api.sendPersonAccess).mockResolvedValue(
      access({ lastSentAt: "2026-10-11T08:00:00Z" })
    );
    renderWithRole(<AccessManagement />, "GESTIONNAIRE");

    const row = (await screen.findByText("Jean Dupont")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: /Envoyer/ }));

    expect(api.sendPersonAccess).toHaveBeenCalledWith("p1");
    expect(toast.success).toHaveBeenCalledWith("Lien envoyé par WhatsApp");
  });

  it("signale un échec d'envoi individuel", async () => {
    vi.mocked(api.sendPersonAccess).mockRejectedValue(
      new Error("WAHA indisponible")
    );
    renderWithRole(<AccessManagement />, "ADMIN");

    const row = (await screen.findByText("Jean Dupont")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: /Envoyer/ }));

    expect(toast.error).toHaveBeenCalledWith("WAHA indisponible");
  });

  it("copie le lien d'une personne", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    renderWithRole(<AccessManagement />, "ADMIN");

    const row = (await screen.findByText("Jean Dupont")).closest("tr")!;
    await user.click(within(row).getByTitle("Copier le lien"));

    expect(writeText).toHaveBeenCalledWith("https://tms.example/m/abc");
  });

  it("envoie à toute la sélection envoyable, avec une pause entre deux envois", async () => {
    vi.mocked(api.fetchAllAccesses).mockResolvedValue([
      access(),
      access({ personId: "p2", personName: "Anne Martin" }),
      access({ personId: "p3", personName: "Sans Numéro", hasPhone: false }),
    ]);
    vi.mocked(api.sendPersonAccess)
      .mockResolvedValueOnce(access())
      .mockRejectedValueOnce(new Error("échec"));
    renderWithRole(<AccessManagement />, "ADMIN");

    await userEvent.click(
      await screen.findByText("Envoyer à la sélection (2)")
    );
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(
      () =>
        expect(toast.error).toHaveBeenCalledWith("1 envoi(s) en échec sur 2"),
      {
        timeout: 5000,
      }
    );
    expect(api.sendPersonAccess).toHaveBeenCalledTimes(2);
  }, 10000);

  it("affiche un message si la sélection est vide", async () => {
    vi.mocked(api.fetchAllAccesses).mockResolvedValue([
      access({ activeTerritories: 0 }),
    ]);
    renderWithRole(<AccessManagement />, "ADMIN");

    expect(
      await screen.findByText("Personne dans cette sélection")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Envoyer à la sélection (0)").closest("button")
    ).toBeDisabled();
  });

  it("signale un échec de chargement de la liste", async () => {
    vi.mocked(api.fetchAllAccesses).mockRejectedValue(
      new Error("Impossible de charger les accès")
    );
    renderWithRole(<AccessManagement />, "ADMIN");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Impossible de charger les accès"
      )
    );
  });

  it("n'affiche pas les réglages à un gestionnaire", async () => {
    renderWithRole(<AccessManagement />, "GESTIONNAIRE");

    await screen.findByText("Jean Dupont");
    expect(screen.queryByText("Réglages")).not.toBeInTheDocument();
    expect(api.fetchAccessSettings).not.toHaveBeenCalled();
  });

  it("enregistre les réglages", async () => {
    vi.mocked(api.saveAccessSettings).mockResolvedValue({
      ...settings,
      assignmentNotificationEnabled: true,
    });
    renderWithRole(<AccessManagement />, "ADMIN");

    await userEvent.click(
      await screen.findByLabelText(/Envoyer automatiquement/)
    );
    await userEvent.click(screen.getByText("Enregistrer les réglages"));

    expect(api.saveAccessSettings).toHaveBeenCalledWith({
      ...settings,
      assignmentNotificationEnabled: true,
    });
    expect(toast.success).toHaveBeenCalledWith("Réglages enregistrés");
  });

  it("enregistre le numéro prévenu des demandes, et le retire si on l'efface", async () => {
    vi.mocked(api.saveAccessSettings).mockImplementation(async (s) => s);
    renderWithRole(<AccessManagement />, "ADMIN");

    const phone = await screen.findByLabelText(
      "Numéro WhatsApp prévenu des demandes de territoire"
    );
    await userEvent.type(phone, "0612345678");
    await userEvent.click(screen.getByText("Enregistrer les réglages"));

    expect(api.saveAccessSettings).toHaveBeenLastCalledWith({
      ...settings,
      territoryRequestPhone: "+33612345678",
    });

    await userEvent.clear(phone);
    await userEvent.click(screen.getByText("Enregistrer les réglages"));

    expect(api.saveAccessSettings).toHaveBeenLastCalledWith(settings);
  });

  it("refuse un gabarit invalide sans appeler l'API", async () => {
    renderWithRole(<AccessManagement />, "ADMIN");

    const textarea = await screen.findByLabelText(
      "Message envoyé à l'attribution"
    );
    await userEvent.clear(textarea);
    await userEvent.click(textarea);
    await userEvent.paste("{% if %}");
    await userEvent.click(screen.getByText("Enregistrer les réglages"));

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Gabarit invalide")
    );
    expect(api.saveAccessSettings).not.toHaveBeenCalled();
  });

  it("signale un échec d'enregistrement des réglages", async () => {
    vi.mocked(api.saveAccessSettings).mockRejectedValue(
      new Error("Impossible d'enregistrer les réglages")
    );
    renderWithRole(<AccessManagement />, "ADMIN");

    await userEvent.click(await screen.findByText("Enregistrer les réglages"));

    expect(toast.error).toHaveBeenCalledWith(
      "Impossible d'enregistrer les réglages"
    );
  });
});
