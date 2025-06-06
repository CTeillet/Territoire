package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateTerritoryDto {
	@NotBlank
	@Size(max = 255)
	private String name;
	private String note;
	private UUID cityId;
	private TerritoryType type;
}
