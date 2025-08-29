package com.teillet.territoire.dto;

import lombok.Data;

@Data
public class AddCityDto {
	private String name;
	private String zipCode;
	private String colorHex; // optional hex color like #RRGGBB
}
