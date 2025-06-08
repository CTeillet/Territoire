package com.teillet.territoire.service;

import com.teillet.territoire.dto.AverageAssignmentDurationDto;
import com.teillet.territoire.dto.TerritoryDistributionByCityDto;
import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.dto.UpdateTerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Territory;
import jakarta.transaction.Transactional;
import org.springframework.web.multipart.MultipartFile;

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

    /**
     * Gets the average duration of territory assignments, grouped by month.
     * @return List of average assignment durations by month
     */
    List<AverageAssignmentDurationDto> getAverageAssignmentDurationByMonth();

    /**
     * Gets the overall average duration of territory assignments.
     * @return The overall average assignment duration in days
     */
    Double getOverallAverageAssignmentDuration();

    /**
     * Gets the distribution of territories by city.
     * @param startDate Optional date to filter territories assigned since a specific date
     * @return List of territory distributions by city
     */
    List<TerritoryDistributionByCityDto> getTerritoryDistributionByCity(LocalDate startDate);

    /**
     * Uploads a territory map image for a territory.
     * @param territoryId The ID of the territory
     * @param file The map image file
     * @return The updated territory
     * @throws IOException If there's an error processing the file
     */
    @Transactional
    Territory uploadTerritoryMap(UUID territoryId, MultipartFile file) throws IOException;

    /**
     * Retrieves a territory map image.
     * @param territoryId The ID of the territory
     * @return The territory with the map image
     */
    Territory getTerritoryWithMap(UUID territoryId);
}
