package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Reçu aussi dans les requêtes (territoires d'une campagne) : Jackson 3 a besoin du constructeur sans argument. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimplifiedTerritoryDto {
	private UUID territoryId;
	private String name;
	private TerritoryStatus status;
	private TerritoryType type;
	private UUID cityId;
	private String cityName;
}
