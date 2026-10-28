package com.teillet.territoire.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Durées (en mois) d'une attribution et de la mise en attente d'un territoire rendu. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DurationSettingsDto {
	@NotNull(message = "La durée d'attribution est obligatoire")
	@Min(value = 1, message = "La durée d'attribution doit être d'au moins 1 mois")
	@Max(value = 24, message = "La durée d'attribution ne peut pas dépasser 24 mois")
	private Integer assignmentDurationMonths;

	@NotNull(message = "La durée d'attente est obligatoire")
	@Min(value = 1, message = "La durée d'attente doit être d'au moins 1 mois")
	@Max(value = 24, message = "La durée d'attente ne peut pas dépasser 24 mois")
	private Integer pendingDurationMonths;
}
