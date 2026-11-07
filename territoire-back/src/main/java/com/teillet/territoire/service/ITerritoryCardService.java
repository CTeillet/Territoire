package com.teillet.territoire.service;

import com.teillet.territoire.enums.CardFraming;

import java.util.UUID;

/**
 * Carte physique d'un territoire : le formulaire « Carte de territoire » rempli (lieu, numéro) avec le plan du
 * quartier où le territoire ressort en vert, pour que la personne qui le reçoit le trouve facilement.
 */
public interface ITerritoryCardService {

    /** Image PNG de la carte, sans rien enregistrer. */
    byte[] renderCard(UUID territoryId, CardFraming framing);

    /** Génère la carte et la garde comme carte du territoire (celle de la page « Impression des cartes »). */
    void saveCard(UUID territoryId, CardFraming framing);
}
