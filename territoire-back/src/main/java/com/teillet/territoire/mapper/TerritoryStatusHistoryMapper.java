package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.TerritoryStatusHistoryDto;
import com.teillet.territoire.model.TerritoryStatusHistory;

public class TerritoryStatusHistoryMapper {
	public static TerritoryStatusHistoryDto toDto(TerritoryStatusHistory territoryStatusHistory) {
		return TerritoryStatusHistoryDto.builder()
				.date(territoryStatusHistory.getDate())
				.availableTerritory(territoryStatusHistory.getAvailableTerritory())
				.lateTerritory(territoryStatusHistory.getLateTerritory())
				.pendingTerritory(territoryStatusHistory.getPendingTerritory())
				.assignedTerritory(territoryStatusHistory.getAssignedTerritory())
				.build();
	}
}
