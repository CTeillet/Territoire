package com.teillet.territoire.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Réglages de l'accès numérique : envoi automatique à l'attribution et gabarits Liquid des messages.
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
}
