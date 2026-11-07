package com.teillet.territoire.enums;

/**
 * Cadrage du plan sur la carte physique d'un territoire : part du cadre occupée par le territoire, le reste montre
 * les rues alentour pour le situer. Un petit territoire (une barre d'immeubles, quelques numéros) occuperait tout le
 * cadre : chaque cadrage a aussi une largeur minimale, pour qu'on voie assez de rues, et leurs noms, autour.
 */
public enum CardFraming {
    TIGHT(0.8, 500),     // Serré : environ 330 m au sol, zoom 18
    NORMAL(0.6, 1000),   // Normal : environ 660 m au sol, zoom 17
    WIDE(0.4, 2000);     // Large : environ 1,3 km au sol, zoom 16

    private final double share;
    private final double minExtentMeters;

    CardFraming(double share, double minExtentMeters) {
        this.share = share;
        this.minExtentMeters = minExtentMeters;
    }

    /** Part de la largeur ou de la hauteur du cadre occupée par le territoire (entre 0 et 1). */
    public double share() {
        return share;
    }

    /**
     * Largeur minimale du plan, en mètres EPSG:3857 (les distances au sol en font les deux tiers autour de Paris).
     * Elle double d'un cadrage au suivant : un niveau de zoom des tuiles de moins.
     */
    public double minExtentMeters() {
        return minExtentMeters;
    }
}
