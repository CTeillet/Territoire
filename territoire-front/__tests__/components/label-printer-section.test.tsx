import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { LabelPrinterSection } from "@/components/parameters/other-parameter/label-printer-section";
import * as assignmentLabel from "@/lib/assignment-label";
import { isAutoPrintEnabled } from "@/lib/label-printer";
import {
  FakePrinterPort,
  stubSerial,
  unstubSerial,
} from "../mocks/serial-port";

vi.mock("sonner", () => ({
  toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.restoreAllMocks();
  // Pas de canvas dans jsdom : l'aperçu n'est pas dessiné
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  localStorage.clear();
  Object.values(toast).forEach((fn) => vi.mocked(fn).mockClear());
});

afterEach(() => {
  unstubSerial();
});

describe("LabelPrinterSection", () => {
  it("explique que le navigateur ne peut pas imprimer", async () => {
    render(<LabelPrinterSection />);

    expect(
      await screen.findByText(/utilisez Chrome ou Edge sur ordinateur/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Choisir l'imprimante" })
    ).not.toBeInTheDocument();
  });

  it("choisit l'imprimante, imprime un test, règle l'impression automatique puis l'oublie", async () => {
    const port = new FakePrinterPort();
    stubSerial([], port);
    const print = vi
      .spyOn(assignmentLabel, "printAssignmentLabel")
      .mockResolvedValue();
    render(<LabelPrinterSection />);

    const autoPrint = () =>
      screen.getByRole("checkbox", {
        name: "Imprimer l'étiquette à chaque attribution faite depuis cet appareil",
      });
    await userEvent.click(
      await screen.findByRole("button", { name: "Choisir l'imprimante" })
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Imprimante d'étiquettes choisie pour cet appareil"
    );
    expect(
      await screen.findByText("Une imprimante est choisie sur cet appareil.")
    ).toBeInTheDocument();
    expect(autoPrint()).toBeChecked();

    await userEvent.click(
      screen.getByRole("button", { name: "Imprimer une étiquette de test" })
    );
    expect(print).toHaveBeenCalledWith({
      person: { id: null, firstName: "Jean", lastName: "Dupont" },
      dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });

    await userEvent.click(autoPrint());
    expect(autoPrint()).not.toBeChecked();
    expect(isAutoPrintEnabled()).toBe(false);

    await userEvent.click(
      screen.getByRole("button", { name: "Oublier l'imprimante" })
    );
    expect(port.forgotten).toBe(true);
    expect(
      await screen.findByRole("button", { name: "Choisir l'imprimante" })
    ).toBeInTheDocument();
    expect(autoPrint()).toBeDisabled();
  });

  it("reste silencieux quand la fenêtre de choix est fermée sans sélection", async () => {
    const serial = stubSerial([]);
    render(<LabelPrinterSection />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Choisir l'imprimante" })
    );

    await waitFor(() => expect(serial.requestPort).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
