import { vi } from "vitest";

/** Réponse d'état de 32 octets d'une P-touch (par défaut : PT-P300BT prêt, ruban de 12 mm). */
export function statusBytes(
  fields: Partial<{
    model: number;
    error1: number;
    error2: number;
    tapeWidth: number;
    statusType: number;
    phaseType: number;
  }> = {}
): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set([0x80, 0x20, 0x42, 0x30]);
  bytes[4] = fields.model ?? 0x72;
  bytes[8] = fields.error1 ?? 0;
  bytes[9] = fields.error2 ?? 0;
  bytes[10] = fields.tapeWidth ?? 12;
  bytes[11] = 0x01;
  bytes[18] = fields.statusType ?? 0;
  bytes[19] = fields.phaseType ?? 0;
  return bytes;
}

/**
 * P-touch simulée derrière Web Serial : répond à chaque demande d'état (ESC i S), puis confirme l'impression
 * après l'ordre d'imprimer (0x1A). Refuse d'être ouverte deux fois, comme un vrai port.
 */
export class FakePrinterPort {
  written: number[] = [];
  /** Ordres d'impression reçus (travaux se terminant par 0x1A). */
  jobs = 0;
  opened = false;
  forgotten = false;
  /** Réponse aux demandes d'état ; null : l'imprimante ne répond pas. */
  status: Uint8Array | null = statusBytes();
  afterPrint: Uint8Array[] = [
    statusBytes({ statusType: 0x06, phaseType: 1 }),
    statusBytes({ statusType: 0x01 }),
  ];
  openError: Error | null = null;
  readable: ReadableStream<Uint8Array> | null = null;
  writable: WritableStream<Uint8Array> | null = null;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  async open() {
    if (this.openError) throw this.openError;
    if (this.opened) throw new DOMException("Déjà ouvert", "InvalidStateError");
    this.opened = true;
    this.readable = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
      },
    });
    this.writable = new WritableStream({
      write: (chunk) => this.receive(chunk),
    });
  }

  private reply(bytes: Uint8Array) {
    try {
      this.controller?.enqueue(bytes.slice());
    } catch {
      // Lecture déjà arrêtée
    }
  }

  private receive(chunk: Uint8Array) {
    this.written.push(...chunk);
    const isStatusRequest =
      chunk.length === 3 && chunk[1] === 0x69 && chunk[2] === 0x53;
    if (isStatusRequest && this.status) this.reply(this.status);
    if (chunk[chunk.length - 1] === 0x1a) {
      this.jobs++;
      this.afterPrint.forEach((status) => this.reply(status));
    }
  }

  async setSignals() {}

  async close() {
    this.opened = false;
    this.readable = null;
    this.writable = null;
  }

  async forget() {
    this.forgotten = true;
  }
}

/**
 * navigator.serial simulé : `ports` sont les imprimantes déjà autorisées, `chosen` celle que l'utilisateur choisit
 * dans la fenêtre du navigateur. Sans `chosen`, la fenêtre est fermée sans choix au bout de `closedAfterMs` ;
 * 0 : refus immédiat, d'un navigateur qui n'affiche pas la fenêtre.
 */
export function stubSerial(
  ports: FakePrinterPort[],
  chosen?: FakePrinterPort,
  closedAfterMs = 0
) {
  const serial = {
    getPorts: vi.fn(async () => ports.filter((port) => !port.forgotten)),
    requestPort: vi.fn(async () => {
      if (!chosen) {
        if (closedAfterMs) {
          await new Promise((resolve) => setTimeout(resolve, closedAfterMs));
        }
        throw new DOMException("Aucun port choisi", "NotFoundError");
      }
      if (!ports.includes(chosen)) ports.push(chosen);
      return chosen;
    }),
  };
  Object.defineProperty(navigator, "serial", {
    value: serial,
    configurable: true,
  });
  return serial;
}

export function unstubSerial() {
  delete (navigator as Navigator & { serial?: unknown }).serial;
}
