package com.teillet.territoire.service;

import com.teillet.territoire.dto.ArchivedTerritoryDto;
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

	/**
	 * Rend disponible tout de suite un territoire en attente, sans attendre la fin de la durée d'attente.
	 * Refusé ({@link IllegalStateException}, 409) pour un territoire qui n'est pas en attente.
	 */
	@Transactional
	TerritoryDto makeAvailable(UUID id) throws IOException;

	Territory getTerritory(UUID id);

	TerritoryDto getTerritoryDto(UUID id) throws IOException;

	@Transactional
	void updateConcaveHull(UUID territoryId);

	@Transactional
	TerritoryDto updateTerritory(UUID id, UpdateTerritoryDto updateDto) throws IOException;

	/** Signale la carte du territoire comme perdue (lost = true) ou la retire des perdus, sans toucher au reste. */
	@Transactional
	TerritoryDto updateLost(UUID id, boolean lost) throws IOException;

	@Transactional
	/** Suppression d'un territoire sans historique ; avec un historique, il faut l'archiver. */
	void deleteTerritory(UUID id);

	/** Archive un territoire (sans attribution en cours) : il disparaît des listes, son historique reste. */
	void archiveTerritory(UUID id);

	void restoreTerritory(UUID id);

	List<ArchivedTerritoryDto> getArchivedTerritories();

    long countTerritoriesNotAssignedSince(LocalDate startDate, LocalDate endDate);

    String getTerritoryCoverageGeoJson(LocalDate startDate, LocalDate endDate) throws IOException;

    List<AverageAssignmentDurationDto> getAverageAssignmentDurationByMonth(LocalDate startDate, LocalDate endDate);

    Double getOverallAverageAssignmentDuration(LocalDate startDate, LocalDate endDate);

    List<TerritoryDistributionByCityDto> getTerritoryDistributionByCity(LocalDate startDate, LocalDate endDate);

    TerritoryPeriodStatisticsDto getPeriodStatistics(LocalDate startDate, LocalDate endDate);

    TerritoryStatusSummaryDto getStatusSummary();

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
     * Remplace l'image de la carte d'un territoire (carte importée ou carte physique générée).
     * @param territoryId L'identifiant du territoire
     * @param content L'image
     * @param fileName Le nom du fichier, repris au téléchargement
     * @param contentType Le type de l'image (image/png...)
     * @return Le territoire modifié
     */
    Territory storeTerritoryMap(UUID territoryId, byte[] content, String fileName, String contentType);

    /**
     * Retrieves a territory map image.
     * @param territoryId The ID of the territory
     * @return The territory with the map image
     */
    Territory getTerritoryWithMap(UUID territoryId);
}
