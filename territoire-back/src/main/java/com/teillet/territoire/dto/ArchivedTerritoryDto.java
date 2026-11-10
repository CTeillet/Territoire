package com.teillet.territoire.dto;

import java.time.Instant;
import java.util.UUID;

/** Territoire archivé, avec le nombre d'attributions de son historique. */
public record ArchivedTerritoryDto(UUID id, String name, String cityName, Instant archivedAt, long assignments) {
}
