package com.teillet.territoire.dto;

import java.time.Instant;

/**
 * État des envois WhatsApp : {@code failing} quand le dernier envoi a échoué (session WAHA déconnectée, clé refusée...),
 * avec le motif du dernier échec.
 */
public record WhatsAppStatusDto(boolean failing, Instant lastSuccessAt, Instant lastFailureAt, String lastFailure) {

	public static WhatsAppStatusDto of(Instant lastSuccessAt, Instant lastFailureAt, String lastFailure) {
		boolean failing = lastFailureAt != null && (lastSuccessAt == null || lastFailureAt.isAfter(lastSuccessAt));
		return new WhatsAppStatusDto(failing, lastSuccessAt, lastFailureAt, lastFailure);
	}
}
