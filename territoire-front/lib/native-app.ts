import type { NativeLabel } from "@/lib/assignment-label";

/**
 * Pont vers l'app iOS TMS (territoire-ios), qui affiche ce site et imprime les étiquettes sur la P-touch en
 * Bluetooth. Absent ailleurs, Safari compris. À appeler dans le navigateur (effet, clic), jamais au chargement du
 * module ni pendant le rendu serveur.
 */

type BridgeMessage =
  ({ action: "print" } & NativeLabel) | { action: "openSettings" };

interface PrinterBridge {
  postMessage(message: BridgeMessage): Promise<unknown>;
}

/** Réponse de l'app à une impression : `message` explique pourquoi l'étiquette n'est pas confirmée. */
interface PrintReply {
  printed?: boolean;
  message?: string;
}

function bridge(): PrinterBridge | null {
  if (typeof window === "undefined") return null;
  const handler = (
    window as Window & {
      webkit?: { messageHandlers?: { tmsPrinter?: PrinterBridge } };
    }
  ).webkit?.messageHandlers?.tmsPrinter;
  return typeof handler?.postMessage === "function" ? handler : null;
}

/** Site affiché dans l'app iOS TMS. */
export const isNativeApp = (): boolean => bridge() !== null;

/**
 * Imprime par l'app, qui dessine l'étiquette, s'y connecte et attend la fin de l'impression. Rejette avec le
 * message de l'app si l'imprimante ne confirme pas l'étiquette.
 */
export async function nativePrintLabel(label: NativeLabel): Promise<void> {
  const api = bridge();
  if (!api) throw new Error("L'app TMS n'est pas disponible.");
  const reply = (await api.postMessage({
    action: "print",
    ...label,
  })) as PrintReply | null;
  if (!reply?.printed) {
    throw new Error(
      reply?.message ||
        "L'app TMS n'a pas confirmé l'impression de l'étiquette."
    );
  }
}

/** Écran Imprimante de l'app : appairage, connexion, étiquette de test et diagnostic. */
export function openNativePrinterSettings(): void {
  bridge()
    ?.postMessage({ action: "openSettings" })
    .catch(() => {});
}
