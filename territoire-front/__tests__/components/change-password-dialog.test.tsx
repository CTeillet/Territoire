import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangePasswordDialog from "@/components/change-password-dialog";
import * as authFetchModule from "@/utils/auth-fetch";
import { toast } from "sonner";
import { jsonResponse } from "../test-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("ChangePasswordDialog", () => {
  let authFetch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    authFetch = vi
      .spyOn(authFetchModule, "authFetch")
      .mockResolvedValue({ ok: true, status: 204 } as Response);
  });

  const renderDialog = () => {
    const onOpenChange = vi.fn();
    const onChanged = vi.fn();
    render(
      <ChangePasswordDialog
        open
        onOpenChange={onOpenChange}
        onChanged={onChanged}
      />
    );
    return { onOpenChange, onChanged };
  };

  const fill = async (current: string, next: string, confirm: string) => {
    if (current)
      await userEvent.type(
        screen.getByLabelText("Mot de passe actuel"),
        current
      );
    if (next)
      await userEvent.type(screen.getByLabelText("Nouveau mot de passe"), next);
    if (confirm)
      await userEvent.type(screen.getByLabelText("Confirmation"), confirm);
  };

  const submit = () =>
    userEvent.click(screen.getByRole("button", { name: "Modifier" }));

  it("exige au moins 10 caractères", async () => {
    renderDialog();

    await fill("ancien", "court", "");

    expect(screen.getByText("Au moins 10 caractères")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Modifier" })).toBeDisabled();
  });

  it("vérifie que la confirmation correspond", async () => {
    renderDialog();

    await fill("ancien", "nouveauMotDePasse1", "different-motdepasse");

    expect(
      screen.getByText("Les mots de passe ne correspondent pas")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Modifier" })).toBeDisabled();
  });

  it("change le mot de passe puis déclenche la reconnexion", async () => {
    const { onOpenChange, onChanged } = renderDialog();

    await fill("ancien", "nouveauMotDePasse1", "nouveauMotDePasse1");
    await submit();

    expect(authFetch).toHaveBeenCalledWith(
      "/api/authentification/mot-de-passe",
      {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: "ancien",
          newPassword: "nouveauMotDePasse1",
        }),
      }
    );
    expect(toast.success).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onChanged).toHaveBeenCalled();
  });

  it("affiche l'erreur de l'API (mot de passe actuel incorrect)", async () => {
    authFetch.mockResolvedValue(
      jsonResponse({ error: "Mot de passe actuel incorrect" }, 400)
    );
    const { onChanged } = renderDialog();

    await fill("faux", "nouveauMotDePasse1", "nouveauMotDePasse1");
    await submit();

    expect(toast.error).toHaveBeenCalledWith("Mot de passe actuel incorrect");
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("affiche un message par défaut si l'API ne répond pas en JSON", async () => {
    authFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("pas du JSON");
      },
    } as unknown as Response);
    renderDialog();

    await fill("ancien", "nouveauMotDePasse1", "nouveauMotDePasse1");
    await submit();

    expect(toast.error).toHaveBeenCalledWith(
      "Impossible de modifier le mot de passe"
    );
  });

  it("signale une erreur réseau", async () => {
    authFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    renderDialog();

    await fill("ancien", "nouveauMotDePasse1", "nouveauMotDePasse1");
    await submit();

    expect(toast.error).toHaveBeenCalledWith("Erreur réseau");
  });

  it("vide le formulaire à la fermeture", async () => {
    const { onOpenChange } = renderDialog();

    await fill("ancien", "", "");
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByLabelText("Mot de passe actuel")).toHaveValue("");
  });
});
