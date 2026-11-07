package com.teillet.territoire.record;

/**
 * Emprise du plan d'une carte physique, que le navigateur dessine depuis les tuiles vectorielles IGN : les bords en
 * degrés (WGS84) et la taille du cadre en pixels CSS, aux mêmes proportions. Le navigateur dessine le plan à deux
 * pixels par pixel CSS, la résolution de la carte.
 */
public record CardMapLayout(double west, double south, double east, double north, int width, int height) {
}
