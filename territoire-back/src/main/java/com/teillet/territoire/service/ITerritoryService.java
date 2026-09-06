package com.teillet.territoire.service;

import com.teillet.territoire.dto.*;
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

    long countTerritoriesNotAssignedSince(LocalDate startDate, LocalDate endDate);

    String getTerritoryCoverageGeoJson(LocalDate startDate, LocalDate endDate) throws IOException;

    List<AverageAssignmentDurationDto> getAverageAssignmentDurationByMonth(LocalDate startDate, LocalDate endDate);

    Double getOverallAverageAssignmentDuration(LocalDate startDate, LocalDate endDate);

    List<TerritoryDistributionByCityDto> getTerritoryDistributionByCity(LocalDate startDate, LocalDate endDate);

    TerritoryPeriodStatisticsDto getPeriodStatistics(LocalDate startDate, LocalDate endDate);

    List<SchoolYearPeriodDto> getAvailableSchoolYears();

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
