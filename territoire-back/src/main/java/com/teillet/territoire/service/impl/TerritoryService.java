package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.*;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.mapper.TerritoryMapper;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.BlockRepository;
import com.teillet.territoire.repository.TerritoryReminderRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.ICampaignService;
import com.teillet.territoire.service.ICityService;
import com.teillet.territoire.service.ITerritoryService;
import com.teillet.territoire.utils.GeoJsonUtils;
import com.teillet.territoire.utils.SchoolYearUtils;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;


import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TerritoryService implements ITerritoryService {
	private static final long MAX_MAP_SIZE_BYTES = 5L * 1024 * 1024;
	private static final Set<String> ALLOWED_MAP_CONTENT_TYPES = Set.of("image/png", "image/jpeg", "image/gif", "image/webp");

	private final TerritoryRepository territoryRepository;
	private final BlockRepository blockRepository;
	private final AssignmentRepository assignmentRepository;
	private final ICampaignService campaignService;
	private final ICityService cityService;
	private final TerritoryReminderRepository reminderRepository;

	public TerritoryService(
		TerritoryRepository territoryRepository,
		BlockRepository blockRepository,
		AssignmentRepository assignmentRepository,
		@Lazy ICampaignService campaignService,
		ICityService cityService,
		TerritoryReminderRepository reminderRepository
	) {
		this.territoryRepository = territoryRepository;
		this.blockRepository = blockRepository;
		this.assignmentRepository = assignmentRepository;
		this.campaignService = campaignService;
		this.cityService = cityService;
		this.reminderRepository = reminderRepository;
	}

	@Override
	public List<Territory> getAllTerritories() {
		return territoryRepository.findAll();
	}

	@Override
	public List<TerritoryDto> getAllTerritoryDtos() {
		return getAllTerritories().stream().map(territory -> {
			try {
				return TerritoryMapper.toDto(territory);
			} catch (IOException e) {
				throw new RuntimeException(e);
			}
		}).toList();
	}

	@Transactional
	@Override
	public Territory saveTerritory(Territory territory) {
		territory.setLastModifiedDate(LocalDate.now());
		return territoryRepository.save(territory);
	}

	@Transactional
	@Override
	public void updateTerritoryStatus(Territory territory, TerritoryStatus newStatus) {
		territory.setStatus(newStatus);
		territoryRepository.save(territory);
	}

	/**
	 * Remet à disposition les territoires « en attente » rendus depuis plus de 4 mois.
	 * Exécuté chaque nuit par {@link com.teillet.territoire.scheduling.NightlyJobs} (et à la demande).
	 * Un territoire en attente sans date de retour exploitable est ignoré (et signalé dans les logs)
	 * au lieu de faire échouer tout le traitement.
	 */
	@Transactional
	@Override
	public void releasePendingTerritories() {
		LocalDate thresholdDate = LocalDate.now().minusMonths(4);
		int released = 0;

		for (Territory territory : territoryRepository.findByStatus(TerritoryStatus.PENDING)) {
			try {
				Optional<LocalDate> lastReturnDate = territory.getAssignments().stream()
						.map(Assignment::getReturnDate)
						.filter(Objects::nonNull)
						.max(Comparator.naturalOrder());

				if (lastReturnDate.isEmpty()) {
					log.warn("Territoire {} en attente sans date de retour : ignoré", territory.getName());
					continue;
				}

				if (lastReturnDate.get().isBefore(thresholdDate)) {
					updateTerritoryStatus(territory, TerritoryStatus.AVAILABLE);
					released++;
				}
			} catch (Exception e) {
				log.error("Impossible de libérer le territoire {}", territory.getId(), e);
			}
		}
		log.info("Libération des territoires en attente terminée : {} territoire(s) disponible(s)", released);
	}

	@Override
	public Territory getTerritory(UUID id) {
		return territoryRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Territoire non trouvé"));
	}

	@Override
	public TerritoryDto getTerritoryDto(UUID id) throws IOException {
		Territory territory = territoryRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Territoire non trouvé"));
		return TerritoryMapper.toDto(territory);
	}

	@Transactional
	@Override
	public void updateConcaveHull(UUID territoryId) {
		log.info("Début : Mise à jour de la concave hull");

		log.info("Mise à jour de la concave hull du territoire {}", territoryId);
		territoryRepository.updateConcaveHullTerritory(territoryId);

		log.info("Récupération du territoire mis à jour");
		Territory result = getTerritory(territoryId);
		result.setLastModifiedDate(LocalDate.now());
		territoryRepository.save(result);

		log.info("Fin : Mise à jour de la concave hull");
	}

	@Override
	public TerritoryDto updateTerritory(UUID id, UpdateTerritoryDto updateDto) throws IOException {
		Territory territory = getTerritory(id);

		// Check if only the note is being modified
		boolean onlyNoteModified = 
			Objects.equals(territory.getName(), updateDto.getName()) &&
			Objects.equals(territory.getType(), updateDto.getType()) &&
			(updateDto.getCityId() == null || Objects.equals(territory.getCity().getId(), updateDto.getCityId()));

		// Only update lastModifiedDate if fields other than note are modified
		if (!onlyNoteModified) {
			territory.setLastModifiedDate(LocalDate.now());
		}

		// ✅ Mise à jour des champs modifiables
		territory.setName(updateDto.getName());
		territory.setNote(updateDto.getNote());
		territory.setType(updateDto.getType());

		// Mise à jour de la ville si un ID de ville est fourni
		if (updateDto.getCityId() != null) {
			territory.setCity(cityService.getCity(updateDto.getCityId()));
		}

		return TerritoryMapper.toDto(territoryRepository.save(territory));
	}

	@Override
	@Transactional
	public void deleteTerritory(UUID territoryId) {
		Territory territory = getTerritory(territoryId);

		// Les rappels envoyés sont conservés, seul leur lien avec ce territoire est retiré (sinon la clé étrangère bloque la suppression)
		reminderRepository.findByTerritories_Id(territoryId).forEach(reminder -> {
			reminder.getTerritories().removeIf(t -> territoryId.equals(t.getId()));
			reminderRepository.save(reminder);
		});

		// Remove territory from all campaigns
		campaignService.deleteTerrritoryFromAllCampaign(territory);

		log.info("Suppression des pâtés appartenant au territoire {}", territoryId);
		blockRepository.deleteBlockByTerritory_Id(territoryId);
		log.info("Suppression des attributions appartenant au territoire {}", territoryId);
		assignmentRepository.deleteByTerritory_Id(territoryId);
		log.info("Suppression du territoire {}", territoryId);
		territoryRepository.deleteById(territoryId);
	}

	@Transactional
	@Override
	public void revokeAssignmentsBulk(String city) {
		if (city != null) {
			assignmentRepository.deleteAssignmentByTerritory_City_Name(city);
			territoryRepository.findByCity_Name(city).forEach(t -> updateTerritoryStatus(t, TerritoryStatus.AVAILABLE));
		} else {
			assignmentRepository.deleteAll();
			territoryRepository.findAll().forEach(t -> updateTerritoryStatus(t, TerritoryStatus.AVAILABLE));
		}
	}

	@Override
	public long countTerritoriesNotAssignedSince(LocalDate startDate, LocalDate endDate) {
		return territoryRepository.countTerritoriesNotAssignedBetween(startDate, endDate);
	}

	@Override
	public String getTerritoryCoverageGeoJson(LocalDate startDate, LocalDate endDate) throws IOException {
		List<Territory> territories = territoryRepository.findAll();
		Set<UUID> notAssignedTerritoryIds = new HashSet<>(territoryRepository.findTerritoryIdsNotAssignedBetween(startDate, endDate));
		return GeoJsonUtils.convertToGeoJSONCoverage(territories, notAssignedTerritoryIds);
	}

	@Override
	public TerritoryPeriodStatisticsDto getPeriodStatistics(LocalDate startDate, LocalDate endDate) {
		// Projection légère (id, type, ville) : on ne charge pas toutes les entités Territory en mémoire
		List<Object[]> rows = territoryRepository.findAllIdTypeAndCityName();
		Set<UUID> notAssignedTerritoryIds = new HashSet<>(territoryRepository.findTerritoryIdsNotAssignedBetween(startDate, endDate));

		Map<TerritoryType, Integer> totalTerritoriesByType = new HashMap<>();
		Map<TerritoryType, Integer> usedTerritoriesByType = new HashMap<>();
		Map<TerritoryType, Integer> availableTerritoriesByType = new HashMap<>();
		for (TerritoryType type : TerritoryType.values()) {
			totalTerritoriesByType.put(type, 0);
			usedTerritoriesByType.put(type, 0);
			availableTerritoriesByType.put(type, 0);
		}

		Map<String, Integer> totalTerritoriesByCity = new HashMap<>();
		Map<String, Integer> usedTerritoriesByCity = new HashMap<>();
		Map<String, Integer> availableTerritoriesByCity = new HashMap<>();
		int used = 0;
		int available = 0;

		for (Object[] row : rows) {
			UUID id = (UUID) row[0];
			TerritoryType type = (TerritoryType) row[1];
			String city = (String) row[2];
			boolean isAvailable = notAssignedTerritoryIds.contains(id);

			if (isAvailable) available++; else used++;
			if (type != null) {
				totalTerritoriesByType.merge(type, 1, Integer::sum);
				(isAvailable ? availableTerritoriesByType : usedTerritoriesByType).merge(type, 1, Integer::sum);
			}
			totalTerritoriesByCity.merge(city, 1, Integer::sum);
			(isAvailable ? availableTerritoriesByCity : usedTerritoriesByCity).merge(city, 1, Integer::sum);
		}

		return TerritoryPeriodStatisticsDto.builder()
				.totalTerritories(rows.size())
				.usedTerritories(used)
				.availableTerritories(available)
				.totalTerritoriesByType(totalTerritoriesByType)
				.usedTerritoriesByType(usedTerritoriesByType)
				.availableTerritoriesByType(availableTerritoriesByType)
				.totalTerritoriesByCity(totalTerritoriesByCity)
				.usedTerritoriesByCity(usedTerritoriesByCity)
				.availableTerritoriesByCity(availableTerritoriesByCity)
				.build();
	}

	@Override
	public List<AverageAssignmentDurationDto> getAverageAssignmentDurationByMonth(LocalDate startDate, LocalDate endDate) {
		return assignmentRepository.findReturnedAssignmentDatesBetween(startDate, endDate).stream()
				.collect(Collectors.groupingBy(
						row -> YearMonth.from((LocalDate) row[0]),
						Collectors.averagingDouble(row ->
								ChronoUnit.DAYS.between((LocalDate) row[0], (LocalDate) row[1])
						)
				))
				.entrySet().stream()
				.map(entry -> AverageAssignmentDurationDto.builder()
						.period(entry.getKey())
						.averageDuration(entry.getValue())
						.build())
				.sorted(Comparator.comparing(AverageAssignmentDurationDto::getPeriod))
				.toList();
	}

	@Override
	public Double getOverallAverageAssignmentDuration(LocalDate startDate, LocalDate endDate) {
		if (startDate == null && endDate == null) {
			return assignmentRepository.calculateOverallAverageAssignmentDuration();
		}
		return assignmentRepository.calculateOverallAverageAssignmentDurationBetween(startDate, endDate);
	}

	@Override
	public List<TerritoryDistributionByCityDto> getTerritoryDistributionByCity(LocalDate startDate, LocalDate endDate) {
		List<Object[]> results = territoryRepository.calculateTerritoryDistributionByCity(startDate, endDate);
		List<TerritoryDistributionByCityDto> distributionDtos = new ArrayList<>();

		for (Object[] result : results) {
			if (result[0] != null && result[1] != null && result[2] != null) {
				String cityName = result[0].toString();
				Long count = ((Number) result[1]).longValue();
				Double percentage = ((Number) result[2]).doubleValue();

				distributionDtos.add(TerritoryDistributionByCityDto.builder()
						.cityName(cityName)
						.territoryCount(count)
						.percentage(percentage)
						.build());
			}
		}

		return distributionDtos;
	}

	@Override
	public List<SchoolYearPeriodDto> getAvailableSchoolYears() {
		int currentStartYear = SchoolYearUtils.resolveStartYear(null);
		LocalDate minDate = assignmentRepository.findMinAssignmentDate();
		int minStartYear = currentStartYear - 5;
		if (minDate != null) {
			int earliestYear = SchoolYearUtils.resolveStartYear(minDate.getYear());
			if (earliestYear < minStartYear) {
				minStartYear = earliestYear;
			}
		}

		List<SchoolYearPeriodDto> periods = new ArrayList<>();
		for (int y = currentStartYear; y >= minStartYear; y--) {
			periods.add(SchoolYearPeriodDto.builder()
					.startYear(y)
					.endYear(y + 1)
					.label(y + " - " + (y + 1))
					.startDate(SchoolYearUtils.getStartDate(y))
					.endDate(SchoolYearUtils.getEndDate(y))
					.current(y == currentStartYear)
					.build());
		}
		return periods;
	}

	@Override
	@Transactional
	public Territory uploadTerritoryMap(UUID territoryId, MultipartFile file) throws IOException {
		log.info("Début : Upload de la carte du territoire {}", territoryId);

		validateMapFile(file);
		Territory territory = getTerritory(territoryId);

		// Store the file data directly using getBytes()
		territory.setTerritoryMap(file.getBytes());
		territory.setTerritoryMapName(file.getOriginalFilename());
		territory.setTerritoryMapContentType(file.getContentType());
		territory.setLastModifiedDate(LocalDate.now());

		Territory savedTerritory = territoryRepository.save(territory);

		log.info("Fin : Upload de la carte du territoire {}", territoryId);
		return savedTerritory;
	}

	/** Seules des images raster de taille raisonnable sont acceptées (pas de SVG/HTML, servis depuis la même origine que l'application). */
	private static void validateMapFile(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new IllegalArgumentException("Le fichier de la carte est vide");
		}
		if (file.getSize() > MAX_MAP_SIZE_BYTES) {
			throw new IllegalArgumentException("La carte dépasse la taille maximale autorisée (5 Mo)");
		}
		String contentType = file.getContentType();
		if (contentType == null || !ALLOWED_MAP_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
			throw new IllegalArgumentException("Format de carte non supporté (PNG, JPEG, GIF ou WebP uniquement)");
		}
	}

	@Override
	public Territory getTerritoryWithMap(UUID territoryId) {
		log.info("Récupération de la carte du territoire {}", territoryId);
		return getTerritory(territoryId);
	}
}
