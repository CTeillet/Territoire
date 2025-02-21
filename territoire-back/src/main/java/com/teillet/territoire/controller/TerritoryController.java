package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.dto.UpdateTerritoryDto;
import com.teillet.territoire.mapper.AssignmentMapper;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.ITerritoryService;
import com.teillet.territoire.utils.GeoJsonUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/territoires")
@RequiredArgsConstructor
@Slf4j
class TerritoryController {
	private final ITerritoryService territoryService;
	private final IAssignmentService assignmentService;

	@GetMapping("/geojson")
	public String getAllTerritories() throws IOException {
		log.info("Début : Récupération des territoires en GeoJson");

		log.info("Appel au service getAllTerritories");
		List<Territory> territories = territoryService.getAllTerritories();

		log.info("Conversion des territoires en GeoJson");
		String geoJSON = GeoJsonUtils.convertToGeoJSON(territories);

		log.info("Fin : Récupération des territoires");
		return geoJSON;
	}

	@PostMapping
	public Territory createTerritory(@RequestBody Territory territory) {
		log.info("Début : Création du territoire : {}", territory.getName());
		Territory createdTerritory = territoryService.saveTerritory(territory);
		log.info("Fin : Création du territoire");
		return createdTerritory;
	}

	@GetMapping("{territoryId}")
	public TerritoryDto getTerritory(@PathVariable UUID territoryId) throws IOException {
		log.info("Début : Récupération du territoire {}", territoryId);
		log.info("Appel au service getTerritory");
		TerritoryDto territory = territoryService.getTerritoryDto(territoryId);
		log.info("Fin : Récupération du territoire");
		return territory;
	}

	@PutMapping("{territoryId}")
	public TerritoryDto modifyTerritory(@PathVariable UUID territoryId, @RequestBody UpdateTerritoryDto updateDto) throws IOException {
		log.info("Début : Modification du territoire, id {} : {}", territoryId, updateDto);
		log.info("Appel au service updateTerritory");
		TerritoryDto updatedTerritory = territoryService.updateTerritory(territoryId, updateDto);
		log.info("Fin : Modification du territoire");
		return updatedTerritory;
	}

	@DeleteMapping("{territoryId}")
	public void deleteTerritory(@PathVariable UUID territoryId) {
		log.info("Début : Suppression Territoire : {}", territoryId);
		territoryService.deleteTerritory(territoryId);
		log.info("Fin : Suppression Territoire");
	}

	@PostMapping("/{territoryId}/attribuer/{personId}")
	public AssignmentDto assignTerritory(
			@PathVariable UUID territoryId,
			@PathVariable UUID personId) {
		Assignment assignment = assignmentService.assignTerritory(territoryId, personId);
		return AssignmentMapper.toDto(assignment);
	}
}
