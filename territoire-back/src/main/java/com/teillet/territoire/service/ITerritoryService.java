package com.teillet.territoire.service;

import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.dto.UpdateTerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Territory;
import jakarta.transaction.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

public interface ITerritoryService {
	List<Territory> getAllTerritories();

	@Transactional
	Territory saveTerritory(Territory territory);

	@Transactional
	void updateTerritoryStatus(Territory territory, TerritoryStatus newStatus);

	Territory getTerritory(UUID id);

	TerritoryDto getTerritoryDto(UUID id) throws IOException;

	@Transactional
	void updateConcaveHull(UUID territoryId);

	@Transactional
	TerritoryDto updateTerritory(UUID id, UpdateTerritoryDto updateDto) throws IOException;

	@Transactional
	void deleteTerritory(UUID id);
}
