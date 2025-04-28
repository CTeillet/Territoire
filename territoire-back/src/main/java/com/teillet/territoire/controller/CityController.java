package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AddCityDto;
import com.teillet.territoire.model.City;
import com.teillet.territoire.service.ICityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/villes")
@RequiredArgsConstructor
@Slf4j
public class CityController {
	private final ICityService cityService;

	// 🔹 Ajout d'une ville
	@PostMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public City addCity(@RequestBody AddCityDto addCityDto) {
		log.info("📌 Demande d'ajout d'une ville");
		City result = cityService.addCity(addCityDto);
		log.info("✅ Ville ajoutée avec succès");
		return result;
	}

	@GetMapping
	public List<City> getCities() {
		log.info("📌 Demande de récupération des villes");
		List<City> result = cityService.getCities();
		result = result.stream().sorted().toList();
		log.info("✅ Villes récupérées avec succès");
		return result;
	}

	@DeleteMapping("/{cityId}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void deleteCity(@PathVariable UUID cityId) {
		log.info("📌 Demande de suppression de la ville {}", cityId);
		cityService.deleteCity(cityId);
		log.info("✅ Ville supprimée avec succès");
	}
}
