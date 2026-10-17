import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import {
  DEFAULT_TEST_MESSAGE,
  WhatsAppTestSection,
} from "@/components/parameters/other-parameter/whatsapp-test-section";
import { jsonResponse, mockApi } from "../test-utils";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const PERSONS = [
  {
    id: "p1",
    firstName: "Corentin",
    lastName: "Teillet",
    phoneNumber: "+33600000001",
  },
  { id: "p2", firstName: "Alice", lastName: "Martin", phoneNumber: "" },
  {
    id: "p3",
    firstName: "Bruno",
    lastName: "Durand",
    phoneNumber: "+33600000002",
  },
];

const chooseCorentin = async () => {
  await userEvent.click(screen.getByRole("combobox", { name: "Destinataire" }));
  await userEvent.click(
    await screen.findByRole("option", { name: /Corentin Teillet/ })
  );
};

beforeEach(() => {
  vi.restoreAllMocks();
  Object.values(toast).forEach((fn) => vi.mocked(fn).mockClear());
});

describe("WhatsAppTestSection", () => {
  it("ne propose que les personnes ayant un numéro, triées par nom", async () => {
    mockApi({ "GET /api/personnes": PERSONS });
    render(<WhatsAppTestSection />);

    await userEvent.click(
      screen.getByRole("combobox", { name: "Destinataire" })
    );
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Bruno Durand+33600000002",
      "Corentin Teillet+33600000001",
    ]);
  });

  it("envoie le message de test à la personne choisie", async () => {
    const api = mockApi({
      "GET /api/personnes": PERSONS,
      "POST /api/whatsapp/test": {
        sent: true,
        recipient: "Corentin Teillet",
        phoneNumber: "+33600000001",
        error: null,
      },
    });
    render(<WhatsAppTestSection />);

    const send = screen.getByRole("button", { name: "Envoyer le test" });
    expect(send).toBeDisabled();
    await chooseCorentin();
    expect(
      screen.getByRole("combobox", { name: "Destinataire" })
    ).toHaveTextContent("Corentin Teillet (+33600000001)");

    await userEvent.click(send);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Envoyé à Corentin Teillet (+33600000001)."
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Message de test envoyé à Corentin Teillet"
    );
    expect(api).toHaveBeenCalledWith("/api/whatsapp/test", {
      method: "POST",
      body: JSON.stringify({ personId: "p1", message: DEFAULT_TEST_MESSAGE }),
    });
  });

  it("affiche la cause quand WAHA refuse l'envoi", async () => {
    mockApi({
      "GET /api/personnes": PERSONS,
      "POST /api/whatsapp/test": {
        sent: false,
        recipient: "Corentin Teillet",
        phoneNumber: "+33600000001",
        error: "IOException : WAHA error: 401",
      },
    });
    render(<WhatsAppTestSection />);

    await chooseCorentin();
    await userEvent.click(
      screen.getByRole("button", { name: "Envoyer le test" })
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Échec de l'envoi à Corentin Teillet (+33600000001) : IOException : WAHA error: 401"
    );
    expect(toast.error).toHaveBeenCalledWith("WAHA a refusé l'envoi");
  });

  it("affiche le motif de l'API si la requête échoue", async () => {
    mockApi({
      "GET /api/personnes": PERSONS,
      "POST /api/whatsapp/test": jsonResponse({ error: "Accès refusé" }, 403),
    });
    render(<WhatsAppTestSection />);

    await chooseCorentin();
    await userEvent.click(
      screen.getByRole("button", { name: "Envoyer le test" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Accès refusé")
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("signale l'échec du chargement des personnes", async () => {
    mockApi({ "GET /api/personnes": jsonResponse({}, 500) });
    render(<WhatsAppTestSection />);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Impossible de charger les personnes"
      )
    );
  });
});
