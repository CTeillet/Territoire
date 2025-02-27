package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.TerritoryStatisticsProjection;
import com.teillet.territoire.dto.TerritoryStatusHistoryDto;
import com.teillet.territoire.mapper.TerritoryStatusHistoryMapper;
import com.teillet.territoire.model.TerritoryStatusHistory;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.TerritoryStatusHistoryRepository;
import com.teillet.territoire.service.ITerritoryStatusHistoryService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TerritoryStatusHistoryService implements ITerritoryStatusHistoryService {
	private final TerritoryRepository territoryRepository;
	private final TerritoryStatusHistoryRepository territoryStatusHistoryRepository;

	@Scheduled(cron = "0 0 0 * * *") // Exécution chaque jour à minuit
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

		// Création et sauvegarde de l'historique
		TerritoryStatusHistory history = TerritoryStatusHistory.builder()
				.availableTerritory(available)
				.lateTerritory(late)
				.pendingTerritory(pending)
				.assignedTerritory(assigned)
				.build();

		territoryStatusHistoryRepository.save(history);

		System.out.println("📊 Statistiques enregistrées : " + history);
	}

	@Override
	public List<TerritoryStatusHistoryDto> getHistoryStatus() {
		List<TerritoryStatusHistory> result = territoryStatusHistoryRepository.findAll();
		return result.stream().map(TerritoryStatusHistoryMapper::toDto).toList();
	}
}
