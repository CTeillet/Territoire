package com.teillet.territoire.event;

import java.util.UUID;

/**
 * Publié lorsqu'une personne demande un nouveau territoire depuis son lien personnel (traité après validation).
 */
public record TerritoryRequestedEvent(UUID requestId) {
}
