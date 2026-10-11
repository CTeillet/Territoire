package com.teillet.territoire.service.impl;

import com.teillet.territoire.repository.projection.TerritoryStatisticsProjection;
import com.teillet.territoire.dto.TerritoryStatusHistoryDto;
import com.teillet.territoire.mapper.TerritoryStatusHistoryMapper;
import com.teillet.territoire.model.TerritoryStatusHistory;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.TerritoryStatusHistoryRepository;
import com.teillet.territoire.service.ITerritoryStatusHistoryService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TerritoryStatusHistoryService implements ITerritoryStatusHistoryService {
	private final TerritoryRepository territoryRepository;
	private final TerritoryStatusHistoryRepository territoryStatusHistoryRepository;

	/**
	 * Exécuté chaque nuit par {@link com.teillet.territoire.scheduling.NightlyJobs}, après la mise à jour
	 * des retards et des territoires en attente, pour que la photographie reflète l'état du jour.
	 * Idempotent : une seconde exécution le même jour met à jour la ligne existante.
	 */
	@Override
	@Transactional
	public void recordDailyStatistics() {
		List<TerritoryStatisticsProjection> stats = territoryRepository.getCurrentTerritoryStats();

		// Initialisation des valeurs par défaut
		int available = 0, late = 0, pending = 0, assigned = 0;

		// Parcours des résultats et assignation des valeurs
		for (TerritoryStatisticsProjection stat : stats) {
			switch (stat.getStatus()) {
				case AVAILABLE -> available = stat.getTotal();
				case LATE -> late = stat.getTotal();
				case PENDING -> pending = stat.getTotal();
				case ASSIGNED -> assigned = stat.getTotal();
			}
		}

		// Création (ou mise à jour si déjà enregistrée aujourd'hui) de l'historique
		LocalDate today = LocalDate.now();
		TerritoryStatusHistory history = territoryStatusHistoryRepository.findFirstByDate(today)
				.orElseGet(() -> TerritoryStatusHistory.builder().date(today).build());
		history.setAvailableTerritory(available);
		history.setLateTerritory(late);
		history.setPendingTerritory(pending);
		history.setAssignedTerritory(assigned);

		territoryStatusHistoryRepository.save(history);

		log.info("📊 Statistiques enregistrées : {}", history);
	}

	@Override
	public List<TerritoryStatusHistoryDto> getHistoryStatus(LocalDate startDate, LocalDate endDate) {
		List<TerritoryStatusHistory> result = territoryStatusHistoryRepository.findByDateBetween(startDate, endDate);
		return result.stream().map(TerritoryStatusHistoryMapper::toDto).toList();
	}
}
