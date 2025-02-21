package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryStatus;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class SimplifiedTerritoryDto {
	private UUID territoryId;
	private String name;
	private TerritoryStatus status;
}
