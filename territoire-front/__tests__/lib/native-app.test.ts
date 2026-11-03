import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isNativeApp,
  nativePrintLabel,
  openNativePrinterSettings,
} from "@/lib/native-app";
import { stubIPhone, stubNativeApp, unstubNativeApp } from "../mocks/ios";

const label = {
  id: "24f49820-801c-4f63-bbd9-526cab9e6743",
  name: "Élodie S.",
  dueDate: "2028-02-29",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  unstubNativeApp();
});

describe("Pont de l'app iOS TMS", () => {
  it("n'existe que dans l'app, pas dans Safari", async () => {
    stubIPhone();
    expect(isNativeApp()).toBe(false);
    await expect(nativePrintLabel(label)).rejects.toThrow(
      "L'app TMS n'est pas disponible."
    );
    expect(() => openNativePrinterSettings()).not.toThrow();

    stubNativeApp();
    expect(isNativeApp()).toBe(true);
  });

  it("envoie le nom et la date, sans commande d'imprimante, et attend la confirmation de l'app", async () => {
    const postMessage = stubNativeApp();

    await expect(nativePrintLabel(label)).resolves.toBeUndefined();

    expect(postMessage).toHaveBeenCalledWith({ action: "print", ...label });
  });

  it("rejette avec le message de l'app quand l'étiquette n'est pas confirmée", async () => {
    stubNativeApp(() => ({
      printed: false,
      message: "Allumez et appairez une PT-P710BT.",
    }));
    await expect(nativePrintLabel(label)).rejects.toThrow(
      "Allumez et appairez une PT-P710BT."
    );

    stubNativeApp(() => null);
    await expect(nativePrintLabel(label)).rejects.toThrow(
      "L'app TMS n'a pas confirmé l'impression de l'étiquette."
    );

    // Message refusé par l'app (ancienne version, origine inconnue) : promesse rejetée par WebKit
    stubNativeApp(() => {
      throw new Error("Demande non reconnue par cette version de l'app TMS.");
    });
    await expect(nativePrintLabel(label)).rejects.toThrow(
      "Demande non reconnue par cette version de l'app TMS."
    );
  });

  it("ouvre l'écran Imprimante de l'app, sans erreur si l'app refuse", async () => {
    const postMessage = stubNativeApp(() => {
      throw new Error("Refusé");
    });

    openNativePrinterSettings();

    expect(postMessage).toHaveBeenCalledWith({ action: "openSettings" });
    // Un rejet non géré ferait échouer le test
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
