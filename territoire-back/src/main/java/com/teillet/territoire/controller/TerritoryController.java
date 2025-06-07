package com.teillet.territoire.controller;

import com.teillet.territoire.dto.*;
import com.teillet.territoire.mapper.TerritoryMapper;
import com.teillet.territoire.model.AddressNotToDo;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.IAddressNotToDoService;
import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.ICityService;
import com.teillet.territoire.service.ITerritoryService;
import com.teillet.territoire.utils.GeoJsonUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
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
	private final ICityService cityService;

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

	@GetMapping
	public List<TerritoryDto> getTerritories() {
		log.info("Début : Récupération des territoires");
		List<TerritoryDto> territories = territoryService.getAllTerritoryDtos();
		log.info("Fin récupération des territoires");
		return territories;
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

	@PostMapping("/{territoryId}/annuler-assignation")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
	public AssignmentDto cancelAssignment(@PathVariable UUID territoryId) {
		log.info("Début : Annulation de l'assignation du territoire {}", territoryId);
		AssignmentDto result = assignmentService.cancelAssignment(territoryId);
		log.info("Fin : Annulation de l'assignation du territoire {}", territoryId);
		return result;
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

	@PutMapping("/verification-disponible")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void checkAvailableTerritories() {
		territoryService.releasePendingTerritories();
	}

	@GetMapping("/statistiques/non-assignes-depuis")
	public long getTerritoriesNotAssignedSince(@RequestParam(required = false) LocalDate startDate) {
		// Si la date n'est pas fournie, utiliser le 1er septembre de l'année précédente
		if (startDate == null) {
			int year = LocalDate.now().getYear();
			// Si on est avant septembre, utiliser l'année précédente - 1, sinon l'année précédente
			if (LocalDate.now().getMonthValue() < 9) {
				year = year - 1;
			}
			startDate = LocalDate.of(year, 9, 1);
		}
		return territoryService.countTerritoriesNotAssignedSince(startDate);
	}

	/**
	 * Endpoint pour récupérer la durée moyenne d'attribution des territoires par mois
	 * @return Liste des durées moyennes d'attribution par mois
	 */
	@GetMapping("/statistiques/duree-moyenne-attribution/par-mois")
	public ResponseEntity<List<AverageAssignmentDurationDto>> getAverageAssignmentDurationByMonth() {
		log.info("Récupération de la durée moyenne d'attribution des territoires par mois");
		List<AverageAssignmentDurationDto> result = territoryService.getAverageAssignmentDurationByMonth();
		return ResponseEntity.ok(result);
	}

	/**
	 * Endpoint pour récupérer la durée moyenne globale d'attribution des territoires
	 * @return Durée moyenne globale d'attribution en jours
	 */
	@GetMapping("/statistiques/duree-moyenne-attribution/globale")
	public ResponseEntity<Double> getOverallAverageAssignmentDuration() {
		log.info("Récupération de la durée moyenne globale d'attribution des territoires");
		Double result = territoryService.getOverallAverageAssignmentDuration();
		return ResponseEntity.ok(result != null ? result : 0.0);
	}

	/**
	 * Endpoint pour récupérer la distribution des territoires par ville
	 * @param startDate Date de début pour filtrer les territoires (optionnel)
	 * @return Liste des distributions de territoires par ville
	 */
	@GetMapping("/statistiques/distribution-par-ville")
	public ResponseEntity<List<TerritoryDistributionByCityDto>> getTerritoryDistributionByCity(
			@RequestParam(required = false) LocalDate startDate) {
		log.info("Récupération de la distribution des territoires par ville");

		// Si la date n'est pas fournie, utiliser le 1er septembre de l'année précédente
		if (startDate == null) {
			int year = LocalDate.now().getYear();
			// Si on est avant septembre, utiliser l'année précédente - 1, sinon l'année précédente
			if (LocalDate.now().getMonthValue() < 9) {
				year = year - 1;
			}
			startDate = LocalDate.of(year, 9, 1);
		}

		List<TerritoryDistributionByCityDto> result = territoryService.getTerritoryDistributionByCity(startDate);
		return ResponseEntity.ok(result);
	}
}
