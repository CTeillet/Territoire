import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Role } from "@/models/role";
import { notifyTerritoryRequestsChanged } from "@/lib/territory-request-api";
import { jsonResponse, mockApi, renderWithRole } from "../test-utils";

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

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderSidebar = (role: Role) =>
    renderWithRole(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
      role
    );

  it("navigue avec des liens Next (sans rechargement complet) et met en avant la page courante", () => {
    mockApi({ "GET /api/demandes-territoire/en-attente/nombre": 0 });
    renderSidebar("ADMIN");

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

  it("affiche le nombre de demandes en attente et le rafraîchit après une action", async () => {
    let pending = 2;
    mockApi({
      "GET /api/demandes-territoire/en-attente/nombre": () => pending,
    });
    renderSidebar("GESTIONNAIRE");

    expect(screen.getByText("Demandes").closest("a")).toHaveAttribute(
      "href",
      "/demandes"
    );
    expect(await screen.findByLabelText("2 en attente")).toHaveTextContent("2");

    pending = 0;
    await act(async () => notifyTerritoryRequestsChanged());

    expect(screen.queryByLabelText(/en attente/)).not.toBeInTheDocument();
  });

  it("ignore une erreur du compteur", async () => {
    const api = mockApi({
      "GET /api/demandes-territoire/en-attente/nombre": jsonResponse(
        { error: "Erreur interne" },
        500
      ),
    });
    renderSidebar("ADMIN");

    await vi.waitFor(() => expect(api).toHaveBeenCalled());
    expect(screen.getByText("Demandes")).toBeInTheDocument();
    expect(screen.queryByLabelText(/en attente/)).not.toBeInTheDocument();
  });

  it("masque les demandes aux simples utilisateurs", () => {
    const api = mockApi({});
    renderSidebar("UTILISATEUR");

    expect(screen.queryByText("Demandes")).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
});
