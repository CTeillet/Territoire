import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { toast } from "sonner";
import { LabelPrinterSection } from "@/components/parameters/other-parameter/label-printer-section";
import * as assignmentLabel from "@/lib/assignment-label";
import { isAutoPrintEnabled, NO_CHOOSER_MESSAGE } from "@/lib/label-printer";
import { isNativeLabelPrintingEnabled } from "@/lib/iphone-label-printer";
import {
  FakePrinterPort,
  stubAndroidSerial,
  stubSerial,
  unstubSerial,
} from "../mocks/serial-port";
import { captureDownloads, stubIPhone } from "../mocks/ios";

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
    ).toHaveTextContent(
      "Sur iPhone et iPad, l'étiquette se télécharge en fichier pour l'application Brother Design&Print 2."
    );
    expect(
      screen.queryByRole("button", { name: "Choisir l'imprimante" })
    ).not.toBeInTheDocument();
  });

  it("dans Samsung Internet, dit d'emblée d'utiliser Chrome, même si Web Serial est annoncé", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 15; SM-X716B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/136.0.0.0 Safari/537.36"
    );
    stubSerial([]);
    render(<LabelPrinterSection />);

    expect(
      await screen.findByText(/utilisez Chrome ou Edge sur ordinateur/)
    ).toHaveTextContent("ou Chrome sur Android (pas Samsung Internet).");
    expect(
      screen.queryByRole("button", { name: "Choisir l'imprimante" })
    ).not.toBeInTheDocument();
  });

  it("sur iPhone, explique le fichier LBX et télécharge une étiquette de test, sans commande Web Serial", async () => {
    stubIPhone();
    const downloads = captureDownloads();
    render(<LabelPrinterSection />);

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Télécharger une étiquette de test",
      })
    );

    expect(downloads.map(({ name }) => name)).toEqual([
      expect.stringMatching(/^etiquette-jean-d-\d{4}-\d{2}-\d{2}\.lbx$/),
    ]);
    expect(screen.getByText(/P-touch Design&Print 2/)).toBeInTheDocument();
    expect(
      screen.getByText(/choisissez Design&Print 2 dans les options de partage/)
    ).toHaveTextContent("puis touchez « Imprimer »");
    expect(screen.queryByText(/ne le permettent pas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/utilisez Chrome/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Choisir l'imprimante" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Utiliser l'app TMS Impression sur cet iPhone",
      })
    ).not.toBeChecked();
    expect(
      screen.getByRole("img", { name: "Aperçu de l'étiquette" })
    ).toBeInTheDocument();
  });

  it("sur iPhone, active TMS Impression sur cet appareil et permet de revenir au LBX", async () => {
    stubIPhone();
    render(<LabelPrinterSection />);
    const choice = await screen.findByRole("checkbox", {
      name: "Utiliser l'app TMS Impression sur cet iPhone",
    });
    await userEvent.click(choice);
    expect(isNativeLabelPrintingEnabled()).toBe(true);
    expect(
      screen.getByRole("button", { name: "Essayer TMS Impression" })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Télécharger une étiquette de test" })
    ).toBeVisible();
    expect(screen.queryByText(/utilisez Chrome/)).not.toBeInTheDocument();
    await userEvent.click(choice);
    expect(isNativeLabelPrintingEnabled()).toBe(false);
    expect(
      screen.queryByRole("button", { name: "Essayer TMS Impression" })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/P-touch Design&Print 2/)).toBeInTheDocument();
  });

  it("ne lit pas l'appareil au rendu serveur : l'hydratation sur iPhone se passe sans écart", async () => {
    stubIPhone();
    const html = renderToString(<LabelPrinterSection />);
    expect(html).not.toContain("Télécharger une étiquette de test");

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const consoleError = vi.spyOn(console, "error");
    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, <LabelPrinterSection />, {
        onRecoverableError: recoverable,
      });
    });

    expect(
      await within(container).findByRole("button", {
        name: "Télécharger une étiquette de test",
      })
    ).toBeInTheDocument();
    expect(recoverable).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    container.remove();
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

  it("sur Chrome pour Android, propose l'étiquette de test une fois l'imprimante choisie", async () => {
    // getPorts() ne renvoie pas l'imprimante choisie
    const port = new FakePrinterPort();
    stubAndroidSerial(port);
    const print = vi
      .spyOn(assignmentLabel, "printAssignmentLabel")
      .mockResolvedValue();
    render(<LabelPrinterSection />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Choisir l'imprimante" })
    );

    expect(
      await screen.findByText("Une imprimante est choisie sur cet appareil.")
    ).toBeInTheDocument();
    expect(port.forgotten).toBe(false);
    await userEvent.click(
      screen.getByRole("button", { name: "Imprimer une étiquette de test" })
    );
    expect(print).toHaveBeenCalled();
  });

  it("reste silencieux quand la fenêtre de choix est fermée sans sélection", async () => {
    const serial = stubSerial([], undefined, 600);
    render(<LabelPrinterSection />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Choisir l'imprimante" })
    );

    await waitFor(() => expect(serial.requestPort).toHaveBeenCalled());
    // Fenêtre fermée au bout de 600 ms
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("explique quoi vérifier quand le navigateur n'ouvre pas la fenêtre de choix", async () => {
    stubSerial([]);
    render(<LabelPrinterSection />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Choisir l'imprimante" })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(NO_CHOOSER_MESSAGE, {
        duration: 10_000,
      })
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Choisir l'imprimante" })
    ).toBeInTheDocument();
  });
});
