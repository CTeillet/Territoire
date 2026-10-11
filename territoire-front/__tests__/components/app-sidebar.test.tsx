import { describe, it, expect, vi, beforeAll } from "vitest";
import { screen } from "@testing-library/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { renderWithRole } from "../test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/territoires/retards",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AppSidebar", () => {
  beforeAll(() => {
    // Utilisé par useIsMobile (SidebarProvider) ; absent de jsdom
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("navigue avec des liens Next (sans rechargement complet) et met en avant la page courante", () => {
    renderWithRole(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
      "ADMIN"
    );

    const late = screen.getByText("Territoires en retard").closest("a")!;
    expect(late).toHaveAttribute("href", "/territoires/retards");
    expect(late.className).toContain("font-bold");
    expect(
      screen.getByText("Territoires").closest("a")!.className
    ).not.toContain("font-bold");
    expect(screen.getByText("Paramètres").closest("a")).toHaveAttribute(
      "href",
      "/parametres"
    );
  });
});
