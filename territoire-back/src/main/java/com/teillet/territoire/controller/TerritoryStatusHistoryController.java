package com.teillet.territoire.controller;

import com.teillet.territoire.dto.TerritoryStatusHistoryDto;
import com.teillet.territoire.service.ITerritoryStatusHistoryService;
import com.teillet.territoire.utils.SchoolYearUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/territoires/statistiques")
@RequiredArgsConstructor
@Slf4j
public class TerritoryStatusHistoryController {
	private final ITerritoryStatusHistoryService territoryStatusHistoryService;

	@GetMapping
	public List<TerritoryStatusHistoryDto> getStatusHistory(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
		// Par défaut : depuis le début de l'année scolaire en cours jusqu'à aujourd'hui
		if (startDate == null) {
			startDate = SchoolYearUtils.getStartDate(SchoolYearUtils.resolveStartYear(null));
		}
		if (endDate == null) {
			endDate = LocalDate.now();
		}
		return territoryStatusHistoryService.getHistoryStatus(startDate, endDate);
	}
}
