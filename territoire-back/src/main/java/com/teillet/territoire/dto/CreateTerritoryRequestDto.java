package com.teillet.territoire.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Demande de nouveau territoire envoyée depuis un lien personnel.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateTerritoryRequestDto {
	public static final int MAX_COMMENT_LENGTH = 500;

	/** Ville souhaitée ; null = pas de préférence. */
	private UUID cityId;

	@Size(max = MAX_COMMENT_LENGTH, message = "Le commentaire ne doit pas dépasser 500 caractères")
	private String comment;
}
