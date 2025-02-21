package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryStatus;
import lombok.Data;

@Data
public class TerritoryStatisticsDto {
	private TerritoryStatus status;
	private int total;
}
