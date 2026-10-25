package com.teillet.territoire.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Territoire en retard, pour le récapitulatif hebdomadaire.
 *
 * @param firstName        prénom de la personne qui l'a (null si aucune attribution en cours)
 * @param dueDate          échéance de l'attribution en cours (null si aucune attribution en cours)
 * @param lastReminderDate date de la dernière relance de cette personne pour ce territoire depuis l'attribution (null si aucune)
 */
public record LateTerritoryDto(UUID id, String name, String cityName, String firstName, String lastName,
                               LocalDate dueDate, LocalDate lastReminderDate) {
}
