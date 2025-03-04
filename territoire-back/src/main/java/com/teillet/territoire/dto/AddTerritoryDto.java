package com.teillet.territoire.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AddTerritoryDto {
	private String name;
	private UUID cityId;
}
