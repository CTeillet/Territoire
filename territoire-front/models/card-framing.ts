/**
 * Cadrage du plan sur la carte physique d'un territoire (cf. CardFraming côté back) : plus il est large, plus on
 * voit de rues autour du territoire pour le situer.
 */
export const CARD_FRAMINGS = ["TIGHT", "NORMAL", "WIDE"] as const;
export type CardFraming = (typeof CARD_FRAMINGS)[number];

export const CARD_FRAMING_LABELS: Record<CardFraming, string> = {
  TIGHT: "Serré",
  NORMAL: "Normal",
  WIDE: "Large",
};
