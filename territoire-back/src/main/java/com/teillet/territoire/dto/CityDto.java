package com.teillet.territoire.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CityDto {
	private UUID id;
	private String name;
	private LatLong center;
}
