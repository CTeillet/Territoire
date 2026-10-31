import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordDialog from "@/components/parameters/user-management/reset-password-dialog";
import { PASSWORD_MIN_LENGTH } from "@/utils/password";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("ResetPasswordDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.success).mockClear();
  });

  const renderDialog = (ok = true) => {
    const onReset = vi.fn().mockResolvedValue(ok);
    render(
      <ResetPasswordDialog username="Alexis" userId="u-1" onReset={onReset} />
    );
    return { onReset };
  };

  const open = () =>
    userEvent.click(
      screen.getByRole("button", {
        name: "Réinitialiser le mot de passe de Alexis",
      })
    );

  const passwordInput = () =>
    screen.getByLabelText("Nouveau mot de passe") as HTMLInputElement;

  it("propose un mot de passe généré à l'ouverture", async () => {
    renderDialog();

    await open();

    expect(passwordInput().value.length).toBeGreaterThanOrEqual(
      PASSWORD_MIN_LENGTH
    );
  });

  it("régénère le mot de passe à la demande", async () => {
    renderDialog();
    await open();
    const first = passwordInput().value;

    await userEvent.click(
      screen.getByRole("button", { name: "Générer un nouveau mot de passe" })
    );

    expect(passwordInput().value).not.toBe(first);
  });

  it("envoie le mot de passe affiché et ferme la modale", async () => {
    const { onReset } = renderDialog();
    await open();
    const shown = passwordInput().value;

    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(onReset).toHaveBeenCalledWith("u-1", shown);
    expect(
      screen.queryByText("Réinitialiser le mot de passe")
    ).not.toBeInTheDocument();
  });

  it("reste ouverte si le serveur refuse", async () => {
    renderDialog(false);
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(screen.getByText("Réinitialiser le mot de passe")).toBeInTheDocument();
  });

  it("copie le mot de passe dans le presse-papiers", async () => {
    // setup() installe le presse-papiers simulé de user-event
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    renderDialog();
    await user.click(
      screen.getByRole("button", {
        name: "Réinitialiser le mot de passe de Alexis",
      })
    );

    await user.click(
      screen.getByRole("button", { name: "Copier le mot de passe" })
    );

    expect(writeText).toHaveBeenCalledWith(passwordInput().value);
    expect(toast.success).toHaveBeenCalledWith("Mot de passe copié");
  });
});
