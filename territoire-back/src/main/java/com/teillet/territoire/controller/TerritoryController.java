package com.teillet.territoire.controller;

import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.TerritoryService;
import com.teillet.territoire.utils.GeoJsonUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/territories")
@RequiredArgsConstructor
class TerritoryController {
	private final TerritoryService territoryService;

	@GetMapping
	public String getAllTerritories() throws IOException {
		List<Territory> territories = territoryService.getAllTerritories();
		return GeoJsonUtils.convertToGeoJSON(territories);
	}
}
