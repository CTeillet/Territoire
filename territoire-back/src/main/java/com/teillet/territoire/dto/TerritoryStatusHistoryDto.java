package com.teillet.territoire.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class TerritoryStatusHistoryDto {
	private LocalDate date;
	private int availableTerritory;
	private int lateTerritory;
	private int pendingTerritory;
	private int assignedTerritory;
}
