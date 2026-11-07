package com.teillet.territoire.enums;

/**
 * Cadrage du plan sur la carte physique d'un territoire : part du cadre occupée par le territoire, le reste montre
 * les rues alentour pour le situer.
 */
public enum CardFraming {
    TIGHT(0.8),  // Serré
    NORMAL(0.6),
    WIDE(0.4);   // Large

    private final double share;

    CardFraming(double share) {
        this.share = share;
    }

    /** Part de la largeur ou de la hauteur du cadre occupée par le territoire (entre 0 et 1). */
    public double share() {
        return share;
    }
}
