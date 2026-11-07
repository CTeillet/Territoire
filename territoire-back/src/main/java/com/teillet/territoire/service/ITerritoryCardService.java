package com.teillet.territoire.service;

import com.teillet.territoire.enums.CardFraming;
import com.teillet.territoire.record.CardMapLayout;

import java.util.UUID;

/**
 * Carte physique d'un territoire : le formulaire « Carte de territoire » rempli (lieu, numéro) avec le plan du
 * quartier où le territoire ressort en vert, pour que la personne qui le reçoit le trouve facilement. Le plan est
 * dessiné par le navigateur (tuiles vectorielles IGN, thèmes au choix) sur l'emprise donnée par {@link #mapLayout}.
 */
public interface ITerritoryCardService {

    /** Emprise du plan pour ce cadrage, centrée sur le territoire. */
    CardMapLayout mapLayout(UUID territoryId, CardFraming framing);

    /** Image PNG de la carte avec ce plan (PNG dessiné sur l'emprise du cadrage), sans rien enregistrer. */
    byte[] renderCard(UUID territoryId, CardFraming framing, byte[] plan);

    /** Génère la carte et la garde comme carte du territoire (celle de la page « Impression des cartes »). */
    void saveCard(UUID territoryId, CardFraming framing, byte[] plan);
}
