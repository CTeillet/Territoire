package com.teillet.territoire.controller;

import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.TerritoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/territories")
@RequiredArgsConstructor
class TerritoryController {
	private final TerritoryService territoryService;

	@GetMapping
	public List<Territory> getAllTerritories() {
		return territoryService.getAllTerritories();
	}
}
