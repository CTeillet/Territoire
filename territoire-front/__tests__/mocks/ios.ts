import { vi } from "vitest";

export const IPHONE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/** Navigateur d'un iPhone (Safari ou application installée sur l'écran d'accueil : même navigator). */
export function stubIPhone() {
  return vi
    .spyOn(navigator, "userAgent", "get")
    .mockReturnValue(IPHONE_USER_AGENT);
}

/**
 * Téléchargements par lien <a download> : jsdom n'a ni URL.createObjectURL ni téléchargement. Chaque clic
 * enregistre le nom proposé et le fichier.
 */
export function captureDownloads() {
  const downloads: { name: string; file: File }[] = [];
  const blobs = new Map<string, File>();
  URL.createObjectURL = vi.fn((file: Blob) => {
    const url = `blob:test/${blobs.size}`;
    blobs.set(url, file as File);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    downloads.push({ name: this.download, file: blobs.get(this.href)! });
  });
  return downloads;
}

/** Partage de fichiers (navigator.canShare / navigator.share), accepté ou non par le navigateur. */
export function stubShare(
  canShare: boolean,
  share: () => Promise<void> = async () => {}
) {
  const shareMock = vi.fn(share);
  Object.defineProperty(navigator, "canShare", {
    value: vi.fn(() => canShare),
    configurable: true,
  });
  Object.defineProperty(navigator, "share", {
    value: shareMock,
    configurable: true,
  });
  return shareMock;
}

export function unstubShare() {
  delete (navigator as Partial<Navigator>).canShare;
  delete (navigator as Partial<Navigator>).share;
}

/** Message reçu par l'app iOS TMS par window.webkit.messageHandlers.tmsPrinter. */
export type NativeAppMessage = { action: string } & Record<string, unknown>;

/**
 * Site affiché dans l'app iOS TMS : pont d'impression de l'app, avec sa réponse (étiquette imprimée par défaut).
 * Navigateur d'iPhone compris, comme dans l'app.
 */
export function stubNativeApp(
  reply: (message: NativeAppMessage) => unknown = () => ({ printed: true })
) {
  stubIPhone();
  const postMessage = vi.fn(async (message: NativeAppMessage) =>
    reply(message)
  );
  (window as unknown as { webkit?: unknown }).webkit = {
    messageHandlers: { tmsPrinter: { postMessage } },
  };
  return postMessage;
}

export function unstubNativeApp() {
  delete (window as unknown as { webkit?: unknown }).webkit;
}
