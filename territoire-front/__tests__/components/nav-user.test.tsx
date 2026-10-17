import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavUser from "@/components/nav-user";
import * as authFetchModule from "@/utils/auth-fetch";
import { renderWithRole } from "../test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/ui/sidebar", () => ({
  SidebarMenuButton: ({
    children,
    ...props
  }: React.ComponentProps<"button">) => <button {...props}>{children}</button>,
}));
// Le dialogue est testé à part : on vérifie seulement son ouverture et la reconnexion demandée
vi.mock("@/components/change-password-dialog", () => ({
  default: ({ open, onChanged }: { open: boolean; onChanged: () => void }) =>
    open ? <button onClick={onChanged}>simuler changement</button> : null,
}));

describe("NavUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockClear();
  });

  it("ouvre le changement de mot de passe depuis le menu", async () => {
    renderWithRole(<NavUser />, "ADMIN");

    await userEvent.click(await screen.findByText("Alice"));
    await userEvent.click(await screen.findByText("Changer mon mot de passe"));

    expect(screen.getByText("simuler changement")).toBeInTheDocument();
  });

  it("après un changement de mot de passe, déconnecte et renvoie à la connexion", async () => {
    const { store } = renderWithRole(<NavUser />, "ADMIN");

    await userEvent.click(await screen.findByText("Alice"));
    await userEvent.click(await screen.findByText("Changer mon mot de passe"));
    await userEvent.click(screen.getByText("simuler changement"));

    expect(store.getState().auth.token).toBeNull();
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("se déconnecte en révoquant les jetons côté serveur", async () => {
    const logoutRequest = vi
      .spyOn(authFetchModule, "logoutRequest")
      .mockResolvedValue();
    const { store } = renderWithRole(<NavUser />, "ADMIN");

    await userEvent.click(await screen.findByText("Alice"));
    await userEvent.click(await screen.findByText("Se déconnecter"));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(logoutRequest).toHaveBeenCalled();
    expect(store.getState().auth.user).toBeNull();
  });

  it("n'affiche rien sans utilisateur connecté", () => {
    const { container } = renderWithRole(<NavUser />, null);

    expect(container).toBeEmptyDOMElement();
  });
});
