/**
 * Largeur d'un texte en Arial, sans canvas (génération d'un fichier, tests). Arial a les mêmes chasses que
 * Helvetica : celles-ci viennent des métriques AFM d'Adobe (Helvetica et Helvetica-Bold, « Core 14 »), en
 * millièmes de la taille de la police, pour les caractères ASCII de l'espace (32) au tilde (126).
 */

const FIRST_CODE = 32;

// prettier-ignore
const REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667,
  556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556,
  556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722,
  500, 500, 500, 334, 260, 334, 584,
];

// prettier-ignore
const BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722,
  611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556,
  611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778,
  556, 556, 500, 389, 280, 389, 584,
];

// Hors ASCII : quelques caractères des noms français ; les lettres accentuées ont la chasse de leur lettre de base
const OTHERS: Record<string, [regular: number, bold: number]> = {
  "’": [222, 278],
  œ: [944, 944],
  Œ: [1000, 1000],
  æ: [889, 889],
  Æ: [1000, 1000],
  ß: [611, 611],
};

// Caractère inconnu : un peu plus large qu'une lettre moyenne, pour ne pas sous-estimer
const FALLBACK = 650;

function charWidth(char: string, bold: boolean): number {
  const other = OTHERS[char];
  if (other) return other[bold ? 1 : 0];
  // « é » → « e » + accent combinant : la lettre de base donne la chasse
  const code = char.normalize("NFD").charCodeAt(0) - FIRST_CODE;
  const table = bold ? BOLD : REGULAR;
  return table[code] ?? FALLBACK;
}

/** Largeur du texte, dans l'unité de `size` (points pour une taille en points). */
export function textWidth(text: string, size: number, bold = false): number {
  let thousandths = 0;
  for (const char of text) thousandths += charWidth(char, bold);
  return (thousandths * size) / 1000;
}
