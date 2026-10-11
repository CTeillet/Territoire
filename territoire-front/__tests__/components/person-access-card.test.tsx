import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PersonAccessCard from "@/components/person/person-access-card";
import * as api from "@/lib/person-access-api";
import { PersonAccessStatus } from "@/models/person-access";
import { toast } from "sonner";
import { renderWithRole } from "../test-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/person-access-api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/person-access-api")>();
  return {
    ...actual,
    fetchPersonAccess: vi.fn(),
    sendPersonAccess: vi.fn(),
    regeneratePersonAccess: vi.fn(),
    revokePersonAccess: vi.fn(),
    updatePersonAccessExpiration: vi.fn(),
  };
});

const status = (
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
  lastSentAt: "2026-10-02T10:00:00Z",
  activeTerritories: 2,
  ...overrides,
});

describe("PersonAccessCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchPersonAccess).mockResolvedValue(status());
  });

  it("n'affiche rien et n'appelle pas l'API pour un simple utilisateur", () => {
    const { container } = renderWithRole(
      <PersonAccessCard personId="p1" />,
      "UTILISATEUR"
    );

    expect(container).toBeEmptyDOMElement();
    expect(api.fetchPersonAccess).not.toHaveBeenCalled();
  });

  it("affiche l'état, le lien et les dates", async () => {
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    expect(
      await screen.findByDisplayValue("https://tms.example/m/abc")
    ).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("jamais")).toBeInTheDocument();
  });

  it("un gestionnaire peut envoyer mais pas régénérer ni révoquer", async () => {
    renderWithRole(<PersonAccessCard personId="p1" />, "GESTIONNAIRE");

    expect(await screen.findByText("Envoyer par WhatsApp")).toBeInTheDocument();
    expect(screen.queryByText("Régénérer")).not.toBeInTheDocument();
    expect(screen.queryByText("Révoquer")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Expire le/)).not.toBeInTheDocument();
  });

  it("envoie le lien par WhatsApp", async () => {
    vi.mocked(api.sendPersonAccess).mockResolvedValue(
      status({ lastSentAt: "2026-10-11T08:00:00Z" })
    );
    renderWithRole(<PersonAccessCard personId="p1" />, "SUPERVISEUR");

    await userEvent.click(await screen.findByText("Envoyer par WhatsApp"));

    expect(api.sendPersonAccess).toHaveBeenCalledWith("p1");
    expect(toast.success).toHaveBeenCalledWith("Lien envoyé par WhatsApp");
  });

  it("désactive l'envoi sans numéro de téléphone", async () => {
    vi.mocked(api.fetchPersonAccess).mockResolvedValue(
      status({ hasPhone: false })
    );
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    await waitFor(() =>
      expect(
        screen.getByText("Envoyer par WhatsApp").closest("button")
      ).toBeDisabled()
    );
  });

  it("affiche l'erreur renvoyée par l'API", async () => {
    vi.mocked(api.sendPersonAccess).mockRejectedValue(
      new Error("WAHA indisponible")
    );
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    await userEvent.click(await screen.findByText("Envoyer par WhatsApp"));

    expect(toast.error).toHaveBeenCalledWith("WAHA indisponible");
  });

  it("signale un échec de chargement", async () => {
    vi.mocked(api.fetchPersonAccess).mockRejectedValue(
      new Error("Impossible de charger l'accès")
    );
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Impossible de charger l'accès")
    );
  });

  it("génère un premier lien après confirmation", async () => {
    vi.mocked(api.fetchPersonAccess).mockResolvedValue(
      status({ status: "AUCUN", link: null })
    );
    vi.mocked(api.regeneratePersonAccess).mockResolvedValue(
      status({ link: "https://tms.example/m/nouveau" })
    );
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    await userEvent.click(await screen.findByText("Générer le lien"));
    expect(
      screen.getByText(/ne sera pas envoyé automatiquement/)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText("Confirmer"));

    expect(api.regeneratePersonAccess).toHaveBeenCalledWith("p1");
    expect(
      await screen.findByDisplayValue("https://tms.example/m/nouveau")
    ).toBeInTheDocument();
  });

  it("régénère en prévenant que l'ancien lien cessera de fonctionner", async () => {
    vi.mocked(api.regeneratePersonAccess).mockResolvedValue(status());
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    await userEvent.click(await screen.findByText("Régénérer"));
    expect(
      screen.getByText(/ancien lien cessera immédiatement/)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText("Confirmer"));

    expect(toast.success).toHaveBeenCalledWith("Nouveau lien généré");
  });

  it("révoque le lien après confirmation", async () => {
    vi.mocked(api.revokePersonAccess).mockResolvedValue(
      status({ status: "REVOQUE", link: null })
    );
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    await userEvent.click(
      await screen.findByRole("button", { name: /Révoquer/ })
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "Révoquer" }).at(-1)!
    );

    expect(api.revokePersonAccess).toHaveBeenCalledWith("p1");
    expect(await screen.findByText("Révoqué")).toBeInTheDocument();
    expect(
      screen.getByText("Envoyer par WhatsApp").closest("button")
    ).toBeDisabled();
  });

  it("enregistre puis supprime une date d'expiration", async () => {
    vi.mocked(api.updatePersonAccessExpiration)
      .mockResolvedValueOnce(status({ expiresAt: "2026-12-31" }))
      .mockResolvedValueOnce(status({ expiresAt: null }));
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    const input = await screen.findByLabelText(/Expire le/);
    await userEvent.type(input, "2026-12-31");
    await userEvent.click(screen.getByText("Enregistrer"));
    expect(api.updatePersonAccessExpiration).toHaveBeenLastCalledWith(
      "p1",
      "2026-12-31"
    );
    expect(toast.success).toHaveBeenLastCalledWith(
      "Date d'expiration enregistrée"
    );

    await userEvent.clear(input);
    await userEvent.click(screen.getByText("Enregistrer"));
    expect(api.updatePersonAccessExpiration).toHaveBeenLastCalledWith(
      "p1",
      null
    );
    expect(toast.success).toHaveBeenLastCalledWith("Expiration supprimée");
  });

  it("copie le lien dans le presse-papiers", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    await user.click(await screen.findByTitle("Copier le lien"));

    expect(writeText).toHaveBeenCalledWith("https://tms.example/m/abc");
    expect(toast.success).toHaveBeenCalledWith("Lien copié");
  });

  it("signale un échec de copie", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("refusé")
    );
    renderWithRole(<PersonAccessCard personId="p1" />, "ADMIN");

    await user.click(await screen.findByTitle("Copier le lien"));

    expect(toast.error).toHaveBeenCalledWith("Impossible de copier le lien");
  });
});
