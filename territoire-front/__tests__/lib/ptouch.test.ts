import { describe, it, expect } from "vitest";
import {
  notReadyReason,
  packBits,
  parseStatus,
  PrinterStatus,
  printableDots,
  printJob,
  rasterLines,
  resetCommands,
  statusErrors,
} from "@/lib/ptouch";
import { statusBytes } from "../mocks/serial-port";

/** Décompression PackBits, pour vérifier l'aller-retour. */
function unpackBits(data: Uint8Array): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const header = data[i++];
    if (header < 128) {
      out.push(...data.subarray(i, i + header + 1));
      i += header + 1;
    } else {
      out.push(...new Array(257 - header).fill(data[i++]));
    }
  }
  return out;
}

const status = (overrides: Partial<PrinterStatus> = {}): PrinterStatus => ({
  model: 0x72,
  errors: 0,
  tapeWidth: 12,
  mediaType: 0x01,
  tapeLength: 0,
  statusType: 0,
  phaseType: 0,
  phase: 0,
  ...overrides,
});

describe("ptouch", () => {
  it("compresse en PackBits sans perte", () => {
    expect([...packBits(Uint8Array.from([0, 0, 0, 0]))]).toEqual([253, 0]);
    expect([...packBits(Uint8Array.from([1, 2, 3]))]).toEqual([2, 1, 2, 3]);

    const cases = [
      new Uint8Array(16),
      Uint8Array.from([
        0, 0, 0xff, 0x0f, 0x0f, 0x0f, 1, 2, 0, 0, 0, 0, 7, 8, 9, 9,
      ]),
      Uint8Array.from({ length: 300 }, (_, i) => (i * 37) % 256),
      new Uint8Array(300).fill(0xaa),
    ];
    for (const data of cases) {
      expect(unpackBits(packBits(data))).toEqual([...data]);
    }
  });

  it("place l'image au centre de la tête, le haut de l'étiquette sur les premiers bits", () => {
    // 2 colonnes, 64 points de haut : point en haut à gauche et en bas à droite
    const ink = new Uint8Array(2 * 64);
    ink[0] = 1;
    ink[63 * 2 + 1] = 1;
    const [first, second] = rasterLines({ width: 2, height: 64, ink });

    expect(first).toHaveLength(16);
    // Marge de (128 - 64) / 2 = 32 points : premier point imprimé = bit de poids fort du 5e octet
    expect([...first]).toEqual([0, 0, 0, 0, 0x80, ...new Array(11).fill(0)]);
    // Dernier point imprimé : point 95, bit de poids faible du 12e octet
    expect(second[11]).toBe(0x01);
    expect(second.reduce((sum, byte) => sum + byte, 0)).toBe(1);
  });

  it("donne la hauteur imprimable selon la largeur du ruban", () => {
    expect(printableDots(12)).toBe(64);
    expect(printableDots(24)).toBe(128);
    expect(printableDots(0)).toBeNull();
    expect(printableDots(36)).toBeNull();
  });

  it("lit un état et ses erreurs", () => {
    expect(parseStatus(new Uint8Array(32))).toBeNull();
    expect(parseStatus(statusBytes().subarray(0, 20))).toBeNull();

    const parsed = parseStatus(
      statusBytes({ error1: 0x01, error2: 0x10, tapeWidth: 0, statusType: 2 })
    )!;
    expect(parsed).toMatchObject({
      model: 0x72,
      errors: 0x0110,
      tapeWidth: 0,
      statusType: 2,
    });
    expect(statusErrors(parsed)).toBe("pas de ruban, capot ouvert");
    expect(notReadyReason(parsed)).toBe("pas de ruban, capot ouvert");

    expect(statusErrors(status())).toBeNull();
    expect(notReadyReason(status())).toBeNull();
    expect(notReadyReason(status({ phaseType: 1 }))).toBe("imprimante occupée");
  });

  it("construit le travail d'impression", () => {
    const blank = new Uint8Array(16);
    const line = new Uint8Array(16).fill(0xff);
    const job = [...printJob([blank, line], status({ tapeWidth: 12 }))];
    const reset = [...resetCommands()];

    expect(job.slice(0, reset.length)).toEqual(reset);
    const settings = job.slice(reset.length);
    // ESC i z : largeur 12 mm, 2 lignes
    expect(settings.slice(0, 13)).toEqual([
      0x1b, 0x69, 0x7a, 0xc4, 0x01, 12, 0, 2, 0, 0, 0, 0, 0,
    ]);
    // ESC i K, ESC i M (PT-P300BT : pas de coupe), ESC i d, compression
    expect(settings.slice(13, 28)).toEqual([
      0x1b, 0x69, 0x4b, 0x08, 0x1b, 0x69, 0x4d, 0x00, 0x1b, 0x69, 0x64, 0, 0,
      0x4d, 0x02,
    ]);
    // Ligne vide puis ligne pleine compressée, puis impression
    expect(settings.slice(28)).toEqual([0x5a, 0x47, 2, 0, 241, 0xff, 0x1a]);
  });

  it("coupe l'étiquette sur les modèles à coupe automatique", () => {
    const job = [...printJob([], status({ model: 0x76 }))];
    const mode = job.findIndex(
      (byte, i) => byte === 0x1b && job[i + 1] === 0x69 && job[i + 2] === 0x4d
    );
    expect(job[mode + 3]).toBe(0x40);
  });
});
