import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LateReminderMessage } from "@/components/parameters/other-parameter/late-reminder-message";
import ParametersPage from "@/app/(app)/parametres/page";
import * as authFetchModule from "@/utils/auth-fetch";
import { toast } from "sonner";
import { renderWithRole } from "../test-utils";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/components/parameters/user-management/user-management", () => ({
  default: () => <div>utilisateurs</div>,
}));
vi.mock("@/components/parameters/city-management/city-management", () => ({
  default: () => <div>villes</div>,
}));
vi.mock("@/components/parameters/other-parameter/other-parameter", () => ({
  default: () => <div>autres</div>,
}));
vi.mock("@/components/parameters/access/access-management", () => ({
  default: () => <div>accès</div>,
}));

const textResponse = (text: string, ok = true): Response =>
  ({ ok, status: ok ? 200 : 500, text: async () => text }) as Response;

describe("LateReminderMessage", () => {
  let authFetch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    authFetch = vi
      .spyOn(authFetchModule, "authFetch")
      .mockImplementation(async (_url, init) =>
        init?.method === "PUT"
          ? textResponse("")
          : textResponse("Bonjour {{ person.name }}")
      );
  });

  it("refuse d'enregistrer un gabarit invalide", async () => {
    render(<LateReminderMessage />);
    const textarea = await screen.findByDisplayValue(
      "Bonjour {{ person.name }}"
    );

    await userEvent.clear(textarea);
    await userEvent.click(textarea);
    await userEvent.paste("{% if %}");
    await userEvent.click(screen.getByText("Sauvegarder"));

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Gabarit invalide")
    );
    expect(authFetch).not.toHaveBeenCalledWith(
      "/api/settings/late-reminder-message",
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("enregistre un gabarit valide", async () => {
    render(<LateReminderMessage />);
    await screen.findByDisplayValue("Bonjour {{ person.name }}");

    await userEvent.click(screen.getByText("Sauvegarder"));

    expect(authFetch).toHaveBeenCalledWith(
      "/api/settings/late-reminder-message",
      expect.objectContaining({
        method: "PUT",
        body: "Bonjour {{ person.name }}",
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Message enregistré");
  });
});

describe("Page Paramètres", () => {
  it.each(["ADMIN", "SUPERVISEUR", "GESTIONNAIRE"] as const)(
    "affiche l'onglet Accès numériques pour %s",
    async (role) => {
      renderWithRole(<ParametersPage />, role);

      await userEvent.click(
        screen.getByRole("tab", { name: "Accès numériques" })
      );
      expect(screen.getByText("accès")).toBeInTheDocument();
    }
  );

  it("masque l'onglet Accès numériques pour un simple utilisateur", () => {
    renderWithRole(<ParametersPage />, "UTILISATEUR");

    expect(
      screen.queryByRole("tab", { name: "Accès numériques" })
    ).not.toBeInTheDocument();
  });
});
