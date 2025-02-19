package com.teillet.territoire.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.mapper.TerritoryMapper;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.ITerritoryService;
import com.teillet.territoire.utils.GeoJsonUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/territoires")
@RequiredArgsConstructor
class TerritoryController {
	private final ITerritoryService territoryService;

	@GetMapping("/geojson")
	public String getAllTerritories() throws IOException {
		List<Territory> territories = territoryService.getAllTerritories();
		return GeoJsonUtils.convertToGeoJSON(territories);
	}

	@PostMapping
	public Territory createTerritory(@RequestBody Territory territory) {
		return territoryService.saveTerritory(territory);
	}

	@GetMapping("{id}")
	public TerritoryDto getTerritory(@PathVariable UUID id) throws IOException {
		Territory territory = territoryService.getTerritory(id);
		TerritoryDto dto = TerritoryMapper.toDto(territory);
		return dto;
	}
}
