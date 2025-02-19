package com.teillet.territoire.service;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.StatusHistory;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.StatusHistoryRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TerritoryService {
	private final TerritoryRepository territoryRepository;
	private final StatusHistoryRepository statusHistoryRepository;

	public List<Territory> getAllTerritories() {
		return territoryRepository.findAll();
	}

	public Territory saveTerritory(Territory territory) {
		territory.setStatus(TerritoryStatus.AVAILABLE);
		territory.setLastModifiedDate(LocalDate.now());
		return territoryRepository.save(territory);
	}

	public void updateTerritoryStatus(Territory territory, TerritoryStatus newStatus) {
		TerritoryStatus previousStatus = territory.getStatus();
		territory.setStatus(newStatus);
		territory.setLastModifiedDate(LocalDate.now());
		territoryRepository.save(territory);

		StatusHistory history = StatusHistory.builder()
				.territory(territory)
				.previousStatus(previousStatus)
				.newStatus(newStatus)
				.changeDate(LocalDate.now())
				.build();
		statusHistoryRepository.save(history);
	}

	@Scheduled(cron = "0 0 0 * * *")
	public void releasePendingTerritories() {
		LocalDate thresholdDate = LocalDate.now().minusMonths(4);
		List<Territory> pendingTerritories = territoryRepository.findAll().stream()
				.filter(t -> t.getStatus() == TerritoryStatus.PENDING && t.getLastModifiedDate().isBefore(thresholdDate))
				.toList();

		for (Territory territory : pendingTerritories) {
			updateTerritoryStatus(territory, TerritoryStatus.AVAILABLE);
		}
	}

	public Territory getTerritory(UUID id) {
		return territoryRepository.getTerritoriesById(id);
	}
}
