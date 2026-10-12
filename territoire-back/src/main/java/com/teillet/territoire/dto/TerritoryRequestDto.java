package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/**
 * Demande de nouveau territoire, vue par les responsables.
 */
@Data
@Builder
public class TerritoryRequestDto {
	private UUID id;
	private UUID personId;
	private String personName;
	/** Ville souhaitée ; null = pas de préférence. */
	private UUID cityId;
	private String cityName;
	private String comment;
	private TerritoryRequestStatus status;
	private Instant createdAt;
	private Instant closedAt;
	/** Territoire attribué en réponse à la demande. */
	private UUID territoryId;
	private String territoryName;
	/** Territoires que la personne a en cours aujourd'hui. */
	private int activeTerritories;
}
