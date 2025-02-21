package com.teillet.territoire.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateTerritoryDto {
	@NotBlank
	@Size(max = 255)
	private String name;

	private String city;
	private String note;
}
