package com.teillet.territoire.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Réglages de l'accès numérique : envoi automatique à l'attribution, gabarits Liquid des messages et numéro prévenu
 * des demandes de territoire.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessSettingsDto {
	private boolean assignmentNotificationEnabled;

	@Size(max = 5000)
	private String assignmentMessage;

	@Size(max = 5000)
	private String accessLinkMessage;

	/** Numéro au format international (+33...) ; vide = pas de message à chaque demande. */
	@Pattern(regexp = "^(\\+[1-9]\\d{6,14})?$", message = "Numéro de téléphone invalide")
	private String territoryRequestPhone;
}
