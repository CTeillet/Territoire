package com.teillet.territoire.service;

import com.teillet.territoire.model.StatusHistory;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.StatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StatusHistoryService {
	private final StatusHistoryRepository statusHistoryRepository;

	public void saveStatusChange(StatusHistory statusHistory) {
		statusHistoryRepository.save(statusHistory);
	}

	public List<StatusHistory> getHistoryForTerritory(Territory territory) {
		return statusHistoryRepository.findByTerritory(territory);
	}
}
