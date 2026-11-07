/**
 * Emprise du plan d'une carte physique (cf. CardMapLayout côté back) : bords en degrés et taille du cadre en pixels
 * CSS, aux mêmes proportions. Le navigateur y dessine le plan IGN, que le back pose dans le cadre de la carte.
 */
export interface CardMapLayout {
  west: number;
  south: number;
  east: number;
  north: number;
  width: number;
  height: number;
}
