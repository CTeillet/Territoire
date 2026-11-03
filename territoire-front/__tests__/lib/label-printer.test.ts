import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  connectLabelPrinter,
  forgetLabelPrinter,
  getLabelPrinter,
  isAutoPrintEnabled,
  isLabelPrintingSupported,
  NO_CHOOSER_MESSAGE,
  printLabel,
  setAutoPrintEnabled,
  UNSUPPORTED_MESSAGE,
} from "@/lib/label-printer";
import { Bitmap } from "@/lib/ptouch";
import {
  FakePrinterPort,
  statusBytes,
  stubSerial,
  unstubSerial,
} from "../mocks/serial-port";

const UNREACHABLE =
  "Imprimante d'étiquettes injoignable : vérifiez qu'elle est allumée et à portée Bluetooth.";

/** Étiquette de 3 colonnes entièrement noire, à la hauteur demandée. */
const render = vi.fn((height: number): Bitmap => ({
  width: 3,
  height,
  ink: new Uint8Array(3 * height).fill(1),
}));

beforeEach(() => {
  localStorage.clear();
  render.mockClear();
});

afterEach(() => {
  unstubSerial();
  vi.useRealTimers();
});

describe("label-printer", () => {
  it("n'est pas disponible sans Web Serial", async () => {
    expect(isLabelPrintingSupported()).toBe(false);
    expect(await getLabelPrinter()).toBeNull();
    await expect(connectLabelPrinter()).rejects.toThrow(UNSUPPORTED_MESSAGE);
    await expect(printLabel(render)).rejects.toThrow(
      "Aucune imprimante d'étiquettes sur cet appareil (Paramètres > Autres paramètres)."
    );
  });

  it("garde l'imprimante choisie, oublie les autres et active l'impression automatique", async () => {
    const previous = new FakePrinterPort();
    const chosen = new FakePrinterPort();
    const serial = stubSerial([previous], chosen);

    expect(isLabelPrintingSupported()).toBe(true);
    expect(await connectLabelPrinter()).toBe(chosen);
    expect(serial.requestPort).toHaveBeenCalledWith({
      allowedBluetoothServiceClassIds: ["00001101-0000-1000-8000-00805f9b34fb"],
    });
    expect(previous.forgotten).toBe(true);
    expect(await getLabelPrinter()).toBe(chosen);
    expect(isAutoPrintEnabled()).toBe(true);

    await forgetLabelPrinter();
    expect(chosen.forgotten).toBe(true);
    expect(await getLabelPrinter()).toBeNull();
    expect(isAutoPrintEnabled()).toBe(false);
  });

  it("distingue une fenêtre de choix fermée d'un navigateur qui ne l'ouvre pas", async () => {
    vi.useFakeTimers();
    // Fenêtre fermée sans choix au bout de 2 s : l'erreur du navigateur, que l'écran passe sous silence
    stubSerial([], undefined, 2000);
    const closed = connectLabelPrinter();
    const assertion = expect(closed).rejects.toMatchObject({
      name: "NotFoundError",
    });
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;

    // Refus immédiat : la fenêtre ne s'est pas ouverte, le message dit quoi vérifier
    stubSerial([]);
    await expect(connectLabelPrinter()).rejects.toThrow(NO_CHOOSER_MESSAGE);

    // Autres erreurs transmises telles quelles
    Object.defineProperty(navigator, "serial", {
      value: {
        getPorts: async () => [],
        requestPort: async () => {
          throw new DOMException("Interdit", "SecurityError");
        },
      },
      configurable: true,
    });
    await expect(connectLabelPrinter()).rejects.toMatchObject({
      name: "SecurityError",
    });
    expect(isAutoPrintEnabled()).toBe(false);
  });

  it("retient le réglage d'impression automatique", () => {
    expect(isAutoPrintEnabled()).toBe(false);
    setAutoPrintEnabled(true);
    expect(isAutoPrintEnabled()).toBe(true);
  });

  it("imprime l'étiquette à la hauteur du ruban en place puis libère le port", async () => {
    const port = new FakePrinterPort();
    port.status = statusBytes({ tapeWidth: 24 });
    stubSerial([port]);

    await printLabel(render);

    expect(render).toHaveBeenCalledWith(128);
    expect(port.jobs).toBe(1);
    // Demande d'état, puis travail d'impression annonçant 3 lignes sur ruban de 24 mm
    const written = port.written.join(",");
    expect(written).toContain("27,105,83");
    expect(written).toContain("27,105,122,196,1,24,0,3,0,0,0");
    expect(port.opened).toBe(false);
  });

  it("imprime une étiquette à la fois", async () => {
    const port = new FakePrinterPort();
    stubSerial([port]);

    await Promise.all([printLabel(render), printLabel(render)]);

    expect(port.jobs).toBe(2);
  });

  it("refuse d'imprimer sur une imprimante en erreur ou un ruban inconnu", async () => {
    const port = new FakePrinterPort();
    port.status = statusBytes({ error2: 0x10 });
    stubSerial([port]);

    await expect(printLabel(render)).rejects.toThrow(
      "Impression impossible : capot ouvert."
    );
    port.status = statusBytes({ tapeWidth: 36 });
    await expect(printLabel(render)).rejects.toThrow(
      "Impression impossible : ruban de 36 mm non pris en charge."
    );
    expect(port.jobs).toBe(0);
    expect(port.opened).toBe(false);
  });

  it("signale une erreur pendant l'impression", async () => {
    const port = new FakePrinterPort();
    port.afterPrint = [statusBytes({ statusType: 0x02, error1: 0x02 })];
    stubSerial([port]);

    await expect(printLabel(render)).rejects.toThrow(
      "Étiquette non imprimée : fin du ruban."
    );

    port.afterPrint = [statusBytes({ statusType: 0x04 })];
    await expect(printLabel(render)).rejects.toThrow(
      "Étiquette non imprimée : imprimante éteinte."
    );
  });

  it("signale une imprimante éteinte ou hors de portée", async () => {
    const port = new FakePrinterPort();
    port.openError = new DOMException("Échec", "NetworkError");
    stubSerial([port]);
    await expect(printLabel(render)).rejects.toThrow(UNREACHABLE);

    // Port ouvert mais aucune réponse : la demande d'état est renvoyée, puis abandon
    vi.useFakeTimers();
    port.openError = null;
    port.status = null;
    const job = printLabel(render);
    const failure = expect(job).rejects.toThrow(UNREACHABLE);
    await vi.advanceTimersByTimeAsync(10000);
    await failure;
    expect(port.written.filter((byte) => byte === 0x53)).toHaveLength(5);
    expect(port.opened).toBe(false);
  });

  it("signale une impression jamais confirmée", async () => {
    vi.useFakeTimers();
    const port = new FakePrinterPort();
    port.afterPrint = [];
    stubSerial([port]);

    const job = printLabel(render);
    const failure = expect(job).rejects.toThrow(
      "L'imprimante n'a pas confirmé l'impression de l'étiquette."
    );
    await vi.advanceTimersByTimeAsync(31000);
    await failure;
  });
});
