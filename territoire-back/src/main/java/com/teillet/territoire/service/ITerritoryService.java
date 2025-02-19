package com.teillet.territoire.service;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Territory;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

public interface ITerritoryService {
	List<Territory> getAllTerritories();

	@Transactional
	Territory saveTerritory(Territory territory);

	@Transactional
	void updateTerritoryStatus(Territory territory, TerritoryStatus newStatus);

	Territory getTerritory(UUID id);
}
