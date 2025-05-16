package com.teillet.territoire.service;

import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.dto.UpdateTerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Territory;
import jakarta.transaction.Transactional;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ITerritoryService {
	List<Territory> getAllTerritories();

	List<TerritoryDto> getAllTerritoryDtos();

	@Transactional
	Territory saveTerritory(Territory territory);

	@Transactional
	void updateTerritoryStatus(Territory territory, TerritoryStatus newStatus);

	@Transactional
	void releasePendingTerritories();

	Territory getTerritory(UUID id);

	TerritoryDto getTerritoryDto(UUID id) throws IOException;

	@Transactional
	void updateConcaveHull(UUID territoryId);

	@Transactional
	TerritoryDto updateTerritory(UUID id, UpdateTerritoryDto updateDto) throws IOException;

	@Transactional
	void deleteTerritory(UUID id);

    @Transactional
    void revokeAssignmentsBulk(String cityName);

    /**
     * Counts territories that haven't been assigned since the given start date.
     * @param startDate The start date (typically September 1st of the previous year)
     * @return The count of territories not assigned since the start date
     */
    long countTerritoriesNotAssignedSince(LocalDate startDate);
}
