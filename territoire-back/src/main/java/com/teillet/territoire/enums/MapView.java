package com.teillet.territoire.enums;

import java.util.EnumSet;
import java.util.Set;

/**
 * Cartes de l'application, chacune avec ses thèmes du Plan IGN (réglés dans Paramètres > Cartes). Par défaut, les
 * cartes à l'écran montrent tout sauf le relief et le cadastre ; la carte physique ne garde que les repères, pour
 * que les rues et leurs noms ressortent une fois imprimés.
 */
public enum MapView {
    /** Page Territoires : tous les territoires. */
    TERRITORIES(onScreen()),
    /** Fiche d'un territoire, où l'on dessine ses pâtés. */
    TERRITORY(onScreen()),
    CAMPAIGN(onScreen()),
    /** Couverture des territoires du tableau de bord. */
    DASHBOARD(onScreen()),
    /** Page personnelle ouverte depuis un lien (/m/…). */
    PUBLIC(onScreen()),
    /** Plan de la carte physique à imprimer (choix proposé par défaut dans sa fenêtre). */
    CARD(EnumSet.of(PlanTheme.PLACES, PlanTheme.BUILDINGS));

    private final Set<PlanTheme> defaultThemes;

    MapView(Set<PlanTheme> defaultThemes) {
        this.defaultThemes = defaultThemes;
    }

    /** Thèmes montrés tant que la carte n'a pas été réglée. */
    public Set<PlanTheme> defaultThemes() {
        return EnumSet.copyOf(defaultThemes);
    }

    private static Set<PlanTheme> onScreen() {
        return EnumSet.complementOf(EnumSet.of(PlanTheme.RELIEF, PlanTheme.CADASTRE));
    }
}
