package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryType;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Territoire disponible proposé pour répondre à une demande.
 *
 * @param lastReturnDate date du dernier retour (null si le territoire n'a jamais été parcouru)
 */
public record AvailableTerritoryDto(UUID id, String name, TerritoryType type, String cityName, LocalDate lastReturnDate) {
}
