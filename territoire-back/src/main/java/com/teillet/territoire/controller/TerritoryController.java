package com.teillet.territoire.controller;

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
	public Territory getTerritory(@PathVariable UUID id) {
		return territoryService.getTerritory(id);
	}
}
