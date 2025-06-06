package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryType;
import lombok.Data;

import java.util.UUID;

@Data
public class AddTerritoryDto {
	private String name;
	private UUID cityId;
	private TerritoryType type;
}
