package com.teillet.territoire.controller;

import com.teillet.territoire.dto.*;
import com.teillet.territoire.mapper.TerritoryMapper;
import com.teillet.territoire.model.AddressNotToDo;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.IAddressNotToDoService;
import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.ITerritoryService;
import com.teillet.territoire.service.impl.CityService;
import com.teillet.territoire.utils.GeoJsonUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
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
	private final IAddressNotToDoService addressNotToDoService;
	private final CityService cityService;

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
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public Territory createTerritory(@RequestBody AddTerritoryDto addTerritoryDto) {
		log.info("Début : Création du territoire : {}", addTerritoryDto.getName());
		Territory territory = TerritoryMapper.fromDto(addTerritoryDto, cityService);
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
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public TerritoryDto modifyTerritory(@PathVariable UUID territoryId, @RequestBody UpdateTerritoryDto updateDto) throws IOException {
		log.info("Début : Modification du territoire, id {} : {}", territoryId, updateDto);
		log.info("Appel au service updateTerritory");
		TerritoryDto updatedTerritory = territoryService.updateTerritory(territoryId, updateDto);
		log.info("Fin : Modification du territoire");
		return updatedTerritory;
	}

	@DeleteMapping("{territoryId}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void deleteTerritory(@PathVariable UUID territoryId) {
		log.info("Début : Suppression Territoire : {}", territoryId);
		territoryService.deleteTerritory(territoryId);
		log.info("Fin : Suppression Territoire");
	}

	@PostMapping("/{territoryId}/attribuer/{personId}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
	public AssignmentDto assignTerritory(
			@PathVariable UUID territoryId,
			@PathVariable UUID personId) {
		return assignmentService.assignTerritory(territoryId, personId);
	}

	@PostMapping("/{territoryId}/retour")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
	public AssignmentDto returnTerritory(@PathVariable UUID territoryId) {
		return assignmentService.returnTerritory(territoryId);
	}

	@PostMapping("/{territoryId}/prolongation")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
	public AssignmentDto extendTerritory(@PathVariable UUID territoryId) {
		return assignmentService.extendTerritory(territoryId);
	}

	@PostMapping("/{territoryId}/adresses-a-ne-pas-visiter")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public AddressNotToDo addAddressNotToDo(@PathVariable UUID territoryId, @RequestBody AddAddressNotToDoDto addressNotToDoDto) {
		return addressNotToDoService.saveAddressNotToDo(territoryId, addressNotToDoDto);
	}

	@PutMapping("/{territoryId}/adresses-a-ne-pas-visiter/{addressId}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public AddressNotToDo addAddressNotToDo(@PathVariable UUID territoryId, @PathVariable UUID addressId, @RequestBody AddAddressNotToDoDto addressNotToDoDto) {
		return addressNotToDoService.updateAddressNotToDo(territoryId, addressId, addressNotToDoDto);
	}
	@DeleteMapping("/{territoryId}/adresses-a-ne-pas-visiter/{addressId}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void deleteAddressNotToDo(@PathVariable UUID territoryId, @PathVariable UUID addressId) {
		addressNotToDoService.deleteAddressNotToDo(territoryId, addressId);
	}
}
