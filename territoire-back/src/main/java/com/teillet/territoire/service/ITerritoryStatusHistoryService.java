package com.teillet.territoire.service;

import com.teillet.territoire.dto.TerritoryStatusHistoryDto;

import java.time.LocalDate;
import java.util.List;

public interface ITerritoryStatusHistoryService {
	List<TerritoryStatusHistoryDto> getHistoryStatus(LocalDate startDate, LocalDate endDate);

	/**
	 * Enregistre (ou met à jour) la photographie des statuts de territoires pour la date du jour.
	 */
	void recordDailyStatistics();
}
