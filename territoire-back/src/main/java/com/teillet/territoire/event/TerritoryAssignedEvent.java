package com.teillet.territoire.event;

import java.util.UUID;

/**
 * Publié lorsqu'un territoire est attribué à une personne (traité après validation de la transaction).
 */
public record TerritoryAssignedEvent(UUID assignmentId, UUID personId, UUID territoryId) {
}
