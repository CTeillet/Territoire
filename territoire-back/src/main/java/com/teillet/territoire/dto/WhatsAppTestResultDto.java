package com.teillet.territoire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Résultat d'un envoi WhatsApp de test. Un refus de WAHA n'est pas une erreur de la requête : il est décrit dans
 * {@code error} pour aider au diagnostic.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppTestResultDto {
	private boolean sent;
	private String recipient;
	private String phoneNumber;

	/** Cause de l'échec (réponse de WAHA, serveur injoignable...) ; null si le message est parti. */
	private String error;
}
