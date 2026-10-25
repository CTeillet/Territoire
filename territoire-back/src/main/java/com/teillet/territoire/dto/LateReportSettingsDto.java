package com.teillet.territoire.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Réglages du récapitulatif hebdomadaire des territoires en retard.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LateReportSettingsDto {
	@NotNull
	@Size(max = 20)
	private List<@NotBlank @Email(message = "Adresse e-mail invalide") @Size(max = 254) String> recipients;

	/** Lecture seule : un serveur SMTP est configuré (variables MAIL_*), sans quoi rien n'est envoyé. */
	private boolean mailConfigured;
}
