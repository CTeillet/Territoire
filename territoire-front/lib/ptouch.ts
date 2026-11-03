/**
 * Protocole raster des Brother P-touch Cube (PT-P300BT, PT-P710BT), d'après la « Raster Command Reference » de
 * Brother et les projets qui pilotent ces imprimantes en Bluetooth (port série SPP) : pt-p710bt-label-maker,
 * PT-P300BT (Ircama).
 *
 * L'étiquette part colonne par colonne, dans le sens de défilement du ruban : chaque ligne raster couvre la
 * largeur de la tête (128 points à 180 dpi), le haut de l'étiquette sur le premier bit.
 */

/** Points par millimètre : têtes à 180 dpi. */
export const DOTS_PER_MM = 180 / 25.4;

const HEAD_DOTS = 128;
const LINE_BYTES = HEAD_DOTS / 8;
const STATUS_LENGTH = 32;
const ESC = 0x1b;

/** Code modèle renvoyé par le PT-P300BT : pas de coupe automatique (lame manuelle). */
const MODEL_PT_P300BT = 0x72;

/**
 * Points imprimables selon la largeur du ruban (en mm, telle que l'imprimante la renvoie), centrés sur la tête.
 * Le PT-P710BT imprime 70 points sur 12 mm, le PT-P300BT seulement 64 : on garde la plus petite valeur.
 */
const PRINTABLE_DOTS: Record<number, number> = {
  4: 24,
  6: 32,
  9: 48,
  12: 64,
  18: 112,
  24: 128,
};

/** Type d'un état envoyé par l'imprimante (octet 18). */
export const StatusType = {
  REPLY: 0x00,
  PRINTING_COMPLETED: 0x01,
  ERROR: 0x02,
  TURNED_OFF: 0x04,
} as const;

/** Erreurs signalées par l'imprimante : octet 8 (poids fort) et octet 9 (poids faible) de l'état. */
const ERRORS: [number, string][] = [
  [0x0100, "pas de ruban"],
  [0x0200, "fin du ruban"],
  [0x0400, "coupe-ruban bloqué"],
  [0x0800, "piles ou batterie faibles"],
  [0x1000, "imprimante occupée"],
  [0x2000, "imprimante éteinte"],
  [0x4000, "adaptateur secteur inadapté"],
  [0x0001, "cassette de ruban non prise en charge"],
  [0x0002, "mémoire de l'imprimante pleine"],
  [0x0004, "erreur de transmission"],
  [0x0008, "mémoire de réception pleine"],
  [0x0010, "capot ouvert"],
  [0x0020, "surchauffe"],
  [0x0040, "le ruban n'avance pas"],
  [0x0080, "erreur de l'imprimante"],
];

/** Image noir et blanc : ink[y * width + x] vaut 1 pour un point imprimé. */
export interface Bitmap {
  width: number;
  height: number;
  ink: Uint8Array;
}

/** État de l'imprimante (réponse de 32 octets). */
export interface PrinterStatus {
  model: number;
  errors: number;
  tapeWidth: number;
  mediaType: number;
  tapeLength: number;
  statusType: number;
  phaseType: number;
  phase: number;
}

/** Hauteur imprimable de l'étiquette en points, null pour une largeur de ruban inconnue (ou pas de ruban). */
export function printableDots(tapeWidth: number): number | null {
  return PRINTABLE_DOTS[tapeWidth] ?? null;
}

/** Remise à zéro (tampon vidé, initialisation) puis passage en mode raster. */
export function resetCommands(): Uint8Array {
  return Uint8Array.from([
    ...new Array(64).fill(0),
    ESC,
    0x40,
    ESC,
    0x69,
    0x61,
    0x01,
  ]);
}

/** Demande d'état : l'imprimante répond par 32 octets. */
export const STATUS_REQUEST = Uint8Array.from([ESC, 0x69, 0x53]);

/** Lit un état de 32 octets ; null si ce n'en est pas un (en-tête inattendu). */
export function parseStatus(bytes: Uint8Array): PrinterStatus | null {
  if (
    bytes.length < STATUS_LENGTH ||
    bytes[0] !== 0x80 ||
    bytes[1] !== 0x20 ||
    bytes[2] !== 0x42
  ) {
    return null;
  }
  return {
    model: bytes[4],
    errors: (bytes[8] << 8) | bytes[9],
    tapeWidth: bytes[10],
    mediaType: bytes[11],
    tapeLength: bytes[17],
    statusType: bytes[18],
    phaseType: bytes[19],
    phase: (bytes[20] << 8) | bytes[21],
  };
}

/** Erreurs de l'état en clair (« capot ouvert, pas de ruban »), null s'il n'y en a pas. */
export function statusErrors(status: PrinterStatus): string | null {
  const messages = ERRORS.filter(([bit]) => status.errors & bit).map(
    ([, message]) => message
  );
  return messages.length > 0 ? messages.join(", ") : null;
}

/** Ce qui empêche d'imprimer maintenant, null si l'imprimante est prête. */
export function notReadyReason(status: PrinterStatus): string | null {
  const errors = statusErrors(status);
  if (errors) return errors;
  if (status.phaseType !== 0 || status.phase !== 0) {
    return "imprimante occupée";
  }
  return null;
}

/** Compression PackBits (TIFF) d'une ligne raster. */
export function packBits(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    // Suite d'octets identiques (2 à 128) : un en-tête négatif puis l'octet
    let run = 1;
    while (i + run < data.length && run < 128 && data[i + run] === data[i]) {
      run++;
    }
    if (run >= 2) {
      out.push(257 - run, data[i]);
      i += run;
      continue;
    }
    // Octets copiés tels quels jusqu'à la prochaine suite (128 au plus)
    const start = i;
    while (
      i < data.length &&
      i - start < 128 &&
      !(i + 1 < data.length && data[i] === data[i + 1])
    ) {
      i++;
    }
    out.push(i - start - 1, ...data.subarray(start, i));
  }
  return Uint8Array.from(out);
}

/** Lignes raster de l'étiquette : une par colonne de l'image, l'image centrée sur la largeur de la tête. */
export function rasterLines(bitmap: Bitmap): Uint8Array[] {
  const offset = Math.floor((HEAD_DOTS - bitmap.height) / 2);
  const lines: Uint8Array[] = [];
  for (let x = 0; x < bitmap.width; x++) {
    const line = new Uint8Array(LINE_BYTES);
    for (let y = 0; y < bitmap.height; y++) {
      if (bitmap.ink[y * bitmap.width + x]) {
        const dot = offset + y;
        line[dot >> 3] |= 0x80 >> (dot & 7);
      }
    }
    lines.push(line);
  }
  return lines;
}

const uint16 = (value: number) => [value & 0xff, (value >> 8) & 0xff];
const uint32 = (value: number) => [...uint16(value), ...uint16(value >>> 16)];

/**
 * Travail d'impression complet d'une étiquette : réglages pris sur l'état de l'imprimante (ruban en place),
 * lignes raster compressées, puis impression. Le PT-P710BT coupe l'étiquette ; le PT-P300BT n'a qu'une lame
 * manuelle.
 */
export function printJob(
  lines: Uint8Array[],
  status: PrinterStatus
): Uint8Array {
  const autoCut = status.model !== MODEL_PT_P300BT;
  const bytes: number[] = [
    ...resetCommands(),
    // ESC i z : champs renseignés (largeur, qualité, reprise après erreur), ruban, nombre de lignes
    ...[ESC, 0x69, 0x7a, 0xc4, status.mediaType, status.tapeWidth],
    ...[status.tapeLength, ...uint32(lines.length), 0, 0],
    // ESC i K : pas d'impression en série, l'étiquette sort entière
    ...[ESC, 0x69, 0x4b, 0x08],
    // ESC i M : coupe automatique
    ...[ESC, 0x69, 0x4d, autoCut ? 0x40 : 0x00],
    // ESC i d : pas de marge ajoutée, celle de l'image suffit
    ...[ESC, 0x69, 0x64, ...uint16(0)],
    // Compression PackBits
    ...[0x4d, 0x02],
  ];
  for (const line of lines) {
    if (line.every((byte) => byte === 0)) {
      bytes.push(0x5a); // ligne vide
    } else {
      const packed = packBits(line);
      bytes.push(0x47, ...uint16(packed.length), ...packed);
    }
  }
  bytes.push(0x1a); // impression avec avance du ruban
  return Uint8Array.from(bytes);
}
