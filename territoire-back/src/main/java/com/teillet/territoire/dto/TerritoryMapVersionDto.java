package com.teillet.territoire.dto;

import java.time.Instant;
import java.util.UUID;

/** Carte précédente d'un territoire (sans l'image, servie à part). */
public record TerritoryMapVersionDto(UUID id, String fileName, String contentType, Instant replacedAt) {
}
