package com.teillet.territoire.service;

import com.teillet.territoire.dto.TerritoryStatusHistoryDto;

import java.time.LocalDate;
import java.util.List;

public interface ITerritoryStatusHistoryService {
	List<TerritoryStatusHistoryDto> getHistoryStatus(LocalDate startDate, LocalDate endDate);
}
