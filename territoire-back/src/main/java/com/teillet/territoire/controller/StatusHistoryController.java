package com.teillet.territoire.controller;

import com.teillet.territoire.model.StatusHistory;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.StatusHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/status-history")
@RequiredArgsConstructor
class StatusHistoryController {
	private final StatusHistoryService statusHistoryService;

	@GetMapping("/{territoryId}")
	public List<StatusHistory> getHistoryForTerritory(@PathVariable UUID territoryId) {
		Territory territory = new Territory();
		territory.setId(territoryId);
		return statusHistoryService.getHistoryForTerritory(territory);
	}
}
