package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.AverageAssignmentDurationDto;
import com.teillet.territoire.dto.TerritoryDistributionByCityDto;
import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.dto.UpdateTerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.mapper.TerritoryMapper;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.BlockRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.ICampaignService;
import com.teillet.territoire.service.ICityService;
import com.teillet.territoire.service.ITerritoryService;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TerritoryService implements ITerritoryService {
	private final TerritoryRepository territoryRepository;
	private final BlockRepository blockRepository;
	private final AssignmentRepository assignmentRepository;
	private final ICampaignService campaignService;
	private final ICityService cityService;

	public TerritoryService(
		TerritoryRepository territoryRepository,
		BlockRepository blockRepository,
		AssignmentRepository assignmentRepository,
		@Lazy ICampaignService campaignService,
		ICityService cityService
	) {
		this.territoryRepository = territoryRepository;
		this.blockRepository = blockRepository;
		this.assignmentRepository = assignmentRepository;
		this.campaignService = campaignService;
		this.cityService = cityService;
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
		territory.setLastModifiedDate(LocalDate.now());
		territoryRepository.save(territory);
	}

	@Scheduled(cron = "0 0 0 * * *")
	@Transactional
	@Override
	public void releasePendingTerritories() {
		LocalDate thresholdDate = LocalDate.now().minusMonths(4);
		List<Territory> pendingTerritories = territoryRepository.findAll().stream()
				.filter(t -> t.getStatus() == TerritoryStatus.PENDING && t.getAssignments().stream().max(Comparator.comparing(Assignment::getReturnDate)).stream().findFirst().orElseThrow().getReturnDate().isBefore(thresholdDate))
				.toList();

		for (Territory territory : pendingTerritories) {
			updateTerritoryStatus(territory, TerritoryStatus.AVAILABLE);
		}
	}

	@Override
	public Territory getTerritory(UUID id) {
		return territoryRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Territoire non trouvé"));
	}

	@Override
	public TerritoryDto getTerritoryDto(UUID id) throws IOException {
		Territory territory = territoryRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Territoire non trouvé"));
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
		territory.setLastModifiedDate(LocalDate.now());
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
	public long countTerritoriesNotAssignedSince(LocalDate startDate) {
		return territoryRepository.countTerritoriesNotAssignedSince(startDate);
	}

	@Override
	public List<AverageAssignmentDurationDto> getAverageAssignmentDurationByMonth() {
		return assignmentRepository.findByReturnDateNotNull().stream()
				.collect(Collectors.groupingBy(
						a -> YearMonth.from(a.getAssignmentDate()),
						Collectors.averagingDouble(a ->
								ChronoUnit.DAYS.between(a.getAssignmentDate(), a.getReturnDate())
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
	public Double getOverallAverageAssignmentDuration() {
		return assignmentRepository.calculateOverallAverageAssignmentDuration();
	}

	@Override
	public List<TerritoryDistributionByCityDto> getTerritoryDistributionByCity(LocalDate startDate) {
		List<Object[]> results = territoryRepository.calculateTerritoryDistributionByCity(startDate);
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
}
