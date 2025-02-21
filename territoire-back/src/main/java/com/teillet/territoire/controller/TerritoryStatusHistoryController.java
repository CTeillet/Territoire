package com.teillet.territoire.controller;

import com.teillet.territoire.dto.TerritoryStatusHistoryDto;
import com.teillet.territoire.service.ITerritoryStatusHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/territoires/statistiques")
@RequiredArgsConstructor
@Slf4j
public class TerritoryStatusHistoryController {
	private final ITerritoryStatusHistoryService territoryStatusHistoryService;

	@GetMapping
	public List<TerritoryStatusHistoryDto> getStatusHistory() {
		return territoryStatusHistoryService.getHistoryStatus();
	}
}
