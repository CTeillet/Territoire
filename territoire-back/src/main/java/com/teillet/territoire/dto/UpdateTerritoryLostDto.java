package com.teillet.territoire.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateTerritoryLostDto {
	/** true : la carte du territoire est perdue ; false : elle est retrouvée ou réimprimée. */
	@NotNull
	private Boolean lost;
}
