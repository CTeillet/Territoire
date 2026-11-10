import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { mockApi, renderWithStore } from "../test-utils";
import { WhatsAppStatusBanner } from "@/components/whatsapp-status-banner";
import { LastSend, lastSendFailed } from "@/components/person/last-send";

vi.mock("next/navigation", () => ({ usePathname: () => "/territoires" }));

const failing = {
  failing: true,
  lastSuccessAt: "2026-11-07T08:00:00Z",
  lastFailureAt: "2026-11-08T09:30:00Z",
  lastFailure: "WAHA error: 422 - session STOPPED",
};

describe("Envois WhatsApp en échec", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("affiche le bandeau à ceux qui attribuent quand les envois échouent", async () => {
    mockApi({ "GET /api/whatsapp/etat": failing });
    renderWithStore(<WhatsAppStatusBanner />, "GESTIONNAIRE");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Les messages WhatsApp ne partent plus");
    expect(alert).toHaveTextContent("WAHA error: 422 - session STOPPED");
    expect(screen.getByRole("link", { name: "Paramètres" })).toHaveAttribute(
      "href",
      "/parametres"
    );
  });

  it("ne montre rien quand les envois fonctionnent ou si l'état est illisible", async () => {
    const api = mockApi({
      "GET /api/whatsapp/etat": { ...failing, failing: false },
    });
    const { unmount } = renderWithStore(<WhatsAppStatusBanner />, "ADMIN");
    await vi.waitFor(() => expect(api).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    unmount();

    vi.restoreAllMocks();
    const broken = mockApi({
      "GET /api/whatsapp/etat": () => Promise.reject(new Error("hors ligne")),
    });
    renderWithStore(<WhatsAppStatusBanner />, "ADMIN");
    await vi.waitFor(() => expect(broken).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("n'interroge pas l'API pour un simple utilisateur", () => {
    const api = mockApi({ "GET /api/whatsapp/etat": failing });
    renderWithStore(<WhatsAppStatusBanner />, "UTILISATEUR");
    expect(api).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("signale l'échec d'un message d'attribution plus récent que le dernier envoi", () => {
    const failed = {
      lastSentAt: "2026-11-01T10:00:00Z",
      lastSendFailedAt: "2026-11-08T10:00:00Z",
      lastSendError: "WAHA error: 422",
    };
    expect(lastSendFailed(failed)).toBe(true);
    expect(
      lastSendFailed({ ...failed, lastSentAt: "2026-11-09T10:00:00Z" })
    ).toBe(false);
    expect(lastSendFailed({ lastSentAt: null, lastSendFailedAt: null })).toBe(
      false
    );

    render(<LastSend access={failed} />);
    expect(screen.getByText(/Échec le/)).toHaveTextContent("WAHA error: 422");

    render(
      <LastSend
        access={{
          lastSentAt: null,
          lastSendFailedAt: null,
          lastSendError: null,
        }}
      />
    );
    expect(screen.getByText("jamais")).toBeInTheDocument();
  });
});
