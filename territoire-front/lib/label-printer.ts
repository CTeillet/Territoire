import {
  Bitmap,
  notReadyReason,
  parseStatus,
  PrinterStatus,
  printableDots,
  printJob,
  rasterLines,
  resetCommands,
  STATUS_REQUEST,
  StatusType,
  statusErrors,
} from "@/lib/ptouch";

/**
 * Imprimante d'étiquettes Brother P-touch reliée en Bluetooth à cet appareil, pilotée par l'API Web Serial
 * (Chrome et Edge sur ordinateur, Chrome sur Android). Le navigateur retient l'imprimante choisie ; l'impression
 * automatique à l'attribution est un réglage de l'appareil.
 */

// Web Serial n'est pas encore dans les types du DOM de TypeScript : seul ce qui sert ici est décrit
export interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  forget?(): Promise<void>;
  setSignals?(signals: {
    dataTerminalReady?: boolean;
    requestToSend?: boolean;
  }): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
}

interface SerialLike {
  getPorts(): Promise<SerialPortLike[]>;
  requestPort(options?: {
    allowedBluetoothServiceClassIds?: string[];
  }): Promise<SerialPortLike>;
}

// Service Bluetooth « port série » (SPP) par lequel passent les P-touch Cube
const SERIAL_PORT_PROFILE = "00001101-0000-1000-8000-00805f9b34fb";
const BAUD_RATE = 9600;
const STATUS_ATTEMPTS = 5;
const STATUS_TIMEOUT_MS = 1500;
const PRINT_TIMEOUT_MS = 30000;
// Personne n'ouvre puis ne ferme la fenêtre de choix aussi vite : un refus plus rapide vient du navigateur
const CHOOSER_MIN_MS = 500;
const AUTO_PRINT_KEY = "labelPrinter.autoPrint";

export const UNSUPPORTED_MESSAGE =
  "Ce navigateur ne peut pas piloter l'imprimante d'étiquettes : utilisez Chrome ou Edge sur ordinateur, ou Chrome sur Android.";
export const NO_CHOOSER_MESSAGE =
  "Ce navigateur n'a pas ouvert la fenêtre de choix de l'imprimante : utilisez Chrome (sur une tablette Samsung, pas Samsung Internet), vérifiez que le Bluetooth est activé et la P-touch appairée, et autorisez Chrome à accéder aux appareils à proximité.";
const NO_PRINTER_MESSAGE =
  "Aucune imprimante d'étiquettes sur cet appareil (Paramètres > Autres paramètres).";
const UNREACHABLE_MESSAGE =
  "Imprimante d'étiquettes injoignable : vérifiez qu'elle est allumée et à portée Bluetooth.";

function serial(): SerialLike | null {
  if (typeof navigator === "undefined") return null;
  const api = (navigator as Navigator & { serial?: SerialLike }).serial;
  // Firefox expose navigator.serial sans requestPort()
  return api && typeof api.requestPort === "function" ? api : null;
}

export const isLabelPrintingSupported = (): boolean => serial() !== null;

/** Imprimante choisie sur cet appareil, null si aucune. */
export async function getLabelPrinter(): Promise<SerialPortLike | null> {
  const api = serial();
  if (!api) return null;
  const ports = await api.getPorts();
  return ports[0] ?? null;
}

/**
 * Choix de l'imprimante dans la liste des appareils Bluetooth appairés (fenêtre du navigateur, à ouvrir depuis
 * un clic). Les autres imprimantes déjà autorisées sont oubliées ; l'impression automatique est activée.
 * Rejette avec NotFoundError si la fenêtre est fermée sans choix.
 */
export async function connectLabelPrinter(): Promise<SerialPortLike> {
  const api = serial();
  if (!api) throw new Error(UNSUPPORTED_MESSAGE);
  const requestedAt = Date.now();
  let port: SerialPortLike;
  try {
    port = await api.requestPort({
      allowedBluetoothServiceClassIds: [SERIAL_PORT_PROFILE],
    });
  } catch (error) {
    // Certains navigateurs annoncent Web Serial sans savoir afficher la fenêtre : ils répondent aussitôt
    // « aucun port choisi », comme si l'utilisateur l'avait fermée
    if (
      (error as Error).name === "NotFoundError" &&
      Date.now() - requestedAt < CHOOSER_MIN_MS
    ) {
      throw new Error(NO_CHOOSER_MESSAGE);
    }
    throw error;
  }
  for (const other of await api.getPorts()) {
    if (other !== port) await other.forget?.();
  }
  setAutoPrintEnabled(true);
  return port;
}

/** Cet appareil n'imprime plus d'étiquettes : l'autorisation donnée au navigateur est retirée. */
export async function forgetLabelPrinter(): Promise<void> {
  const api = serial();
  if (api) {
    for (const port of await api.getPorts()) await port.forget?.();
  }
  setAutoPrintEnabled(false);
}

/** Impression automatique à chaque attribution faite depuis cet appareil. */
export function isAutoPrintEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_PRINT_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAutoPrintEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_PRINT_KEY, String(enabled));
  } catch {
    // Stockage indisponible (navigation privée) : réglage perdu à la fermeture
  }
}

/** Port ouvert : les octets reçus s'accumulent dans un tampon, lu par paquets de 32 (un état). */
class PrinterConnection {
  private received = new Uint8Array(0);
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>;

  private constructor(private readonly port: SerialPortLike) {
    this.reader = port.readable!.getReader();
    this.writer = port.writable!.getWriter();
    void this.pump();
  }

  static async open(port: SerialPortLike): Promise<PrinterConnection> {
    try {
      await port.open({ baudRate: BAUD_RATE });
    } catch {
      throw new Error(UNREACHABLE_MESSAGE);
    }
    // Comme pyserial à l'ouverture : sans ces signaux, certaines imprimantes Bluetooth ne répondent pas
    await port
      .setSignals?.({ dataTerminalReady: true, requestToSend: true })
      .catch(() => {});
    return new PrinterConnection(port);
  }

  private async pump() {
    try {
      for (;;) {
        const { value, done } = await this.reader.read();
        if (done) return;
        if (value?.length) {
          const next = new Uint8Array(this.received.length + value.length);
          next.set(this.received);
          next.set(value, this.received.length);
          this.received = next;
        }
      }
    } catch {
      // Port fermé
    }
  }

  write(bytes: Uint8Array): Promise<void> {
    return this.writer.write(bytes);
  }

  clear() {
    this.received = new Uint8Array(0);
  }

  /** Prochain état reçu, null au bout de timeoutMs. */
  async readStatus(timeoutMs: number): Promise<PrinterStatus | null> {
    const deadline = Date.now() + timeoutMs;
    while (this.received.length < 32) {
      if (Date.now() >= deadline) return null;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const status = parseStatus(this.received.subarray(0, 32));
    this.received = this.received.slice(32);
    return status;
  }

  async close() {
    await this.reader.cancel().catch(() => {});
    this.reader.releaseLock();
    this.writer.releaseLock();
    await this.port.close().catch(() => {});
  }
}

/** État de l'imprimante ; la demande est renvoyée tant qu'elle ne répond pas (connexion Bluetooth lente). */
async function requestStatus(
  connection: PrinterConnection
): Promise<PrinterStatus> {
  for (let attempt = 0; attempt < STATUS_ATTEMPTS; attempt++) {
    connection.clear();
    await connection.write(resetCommands());
    await connection.write(STATUS_REQUEST);
    const status = await connection.readStatus(STATUS_TIMEOUT_MS);
    if (status) return status;
  }
  throw new Error(UNREACHABLE_MESSAGE);
}

/** Attend que l'imprimante confirme la fin de l'impression. */
async function waitForPrinting(connection: PrinterConnection): Promise<void> {
  const deadline = Date.now() + PRINT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await connection.readStatus(deadline - Date.now());
    if (!status) break;
    const errors = statusErrors(status);
    if (errors || status.statusType === StatusType.ERROR) {
      throw new Error(`Étiquette non imprimée : ${errors ?? "erreur"}.`);
    }
    if (status.statusType === StatusType.TURNED_OFF) {
      throw new Error("Étiquette non imprimée : imprimante éteinte.");
    }
    if (status.statusType === StatusType.PRINTING_COMPLETED) return;
  }
  throw new Error("L'imprimante n'a pas confirmé l'impression de l'étiquette.");
}

async function print(render: (height: number) => Bitmap): Promise<void> {
  const port = await getLabelPrinter();
  if (!port) throw new Error(NO_PRINTER_MESSAGE);
  const connection = await PrinterConnection.open(port);
  try {
    const status = await requestStatus(connection);
    const reason = notReadyReason(status);
    if (reason) throw new Error(`Impression impossible : ${reason}.`);
    const height = printableDots(status.tapeWidth);
    if (!height) {
      throw new Error(
        `Impression impossible : ruban de ${status.tapeWidth} mm non pris en charge.`
      );
    }
    await connection.write(printJob(rasterLines(render(height)), status));
    await waitForPrinting(connection);
  } finally {
    await connection.close();
  }
}

// Une impression à la fois : le port ne s'ouvre qu'une fois
let queue: Promise<unknown> = Promise.resolve();

/**
 * Imprime une étiquette sur l'imprimante de cet appareil. `render` dessine l'étiquette à la hauteur imprimable
 * du ruban en place (64 points pour un ruban de 12 mm), connue une fois l'imprimante interrogée.
 */
export function printLabel(render: (height: number) => Bitmap): Promise<void> {
  const job = queue.then(() => print(render));
  queue = job.catch(() => {});
  return job;
}
