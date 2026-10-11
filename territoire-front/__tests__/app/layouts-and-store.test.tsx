import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { useSelector } from "react-redux";
import PublicAccessLayout, {
  metadata as publicMetadata,
} from "@/app/m/[token]/layout";
import AppLayout from "@/app/(app)/layout";
import RootLayout, { metadata as rootMetadata } from "@/app/layout";
import type { RootState } from "@/store/store";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
}));
vi.mock("@/components/app-sidebar", () => ({
  AppSidebar: () => <nav>menu</nav>,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

const user = { id: "u1", email: "a@b.fr", username: "Alice", role: "ADMIN" };
const expire = () => {
  document.cookie = "token=; Max-Age=0";
  document.cookie = "user=; Max-Age=0";
};

describe("Mises en page", () => {
  it("la page personnelle n'est ni indexée ni transmise en Referer", () => {
    expect(publicMetadata.robots).toEqual({ index: false, follow: false });
    expect(publicMetadata.referrer).toBe("no-referrer");

    render(<PublicAccessLayout>contenu</PublicAccessLayout>);
    expect(screen.getByRole("main")).toHaveTextContent("contenu");
  });

  it("l'application de gestion affiche la barre latérale", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    render(<AppLayout>page</AppLayout>);

    expect(screen.getByRole("navigation")).toHaveTextContent("menu");
    expect(screen.getByRole("main")).toHaveTextContent("page");
    expect(
      screen.getByRole("button", { name: "Toggle Sidebar" })
    ).toBeInTheDocument();
  });

  it("la mise en page racine déclare la langue, les polices et le manifeste PWA", () => {
    const html = RootLayout({ children: "page" }) as React.ReactElement<{
      lang: string;
      children: React.ReactElement<{ className: string }>;
    }>;

    expect(html.type).toBe("html");
    expect(html.props.lang).toBe("fr");
    expect(html.props.children.props.className).toContain(
      "font-sans font-mono"
    );
    expect(rootMetadata.manifest).toBe("/manifest.json");
  });
});

describe("Store", () => {
  beforeEach(() => {
    vi.resetModules();
    expire();
  });
  afterEach(expire);

  it("restaure la session à partir des cookies", async () => {
    document.cookie = "token=jwt";
    document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}`;

    const { store } = await import("@/store/store");

    expect(store.getState().auth.user).toEqual(user);
    expect(store.getState().auth.token).toBe("jwt");
  });

  it("ignore un cookie utilisateur illisible", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    document.cookie = "token=jwt";
    document.cookie = "user=%7Bpas-du-json";

    const { store } = await import("@/store/store");

    expect(store.getState().auth.user).toBeNull();
    expect(error).toHaveBeenCalledWith(
      "Erreur lors du parsing des données utilisateur:",
      expect.any(SyntaxError)
    );
  });

  it("le provider expose le store de l'application", async () => {
    const { ReduxProvider } = await import("@/store/provider");
    const Probe = () => (
      <span>{useSelector((s: RootState) => String(s.auth.user))}</span>
    );

    render(
      <ReduxProvider>
        <Probe />
      </ReduxProvider>
    );

    expect(screen.getByText("null")).toBeInTheDocument();
  });
});
