package com.teillet.territoire.controller;


import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.service.IExcelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/excel")
@RequiredArgsConstructor
@Slf4j
public class ExcelController {

	private final CityRepository cityRepository;
	private final IExcelService excelService;

	@GetMapping
	public ResponseEntity<byte[]> exportExcel() {
		try {
			// Récupérer toutes les villes avec leurs territoires et affectations
			List<City> cities = cityRepository.findAll();
			cities = cities.stream().map(city -> {
				List<Territory> territories = city.getTerritories();
				territories = territories.stream().sorted(Comparator.comparing(Territory::getName)).toList();
				city.setTerritories(territories);
				return city;
			}).sorted(Comparator.comparing(City::getName)).collect(Collectors.toList());

			// Générer l'Excel en mémoire
			ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
			excelService.generateExcel(cities, outputStream);

			// Préparer la réponse HTTP
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
			headers.setContentDispositionFormData("attachment", "territoires.xlsx");

			return new ResponseEntity<>(outputStream.toByteArray(), headers, HttpStatus.OK);
		} catch (IOException e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
		}
	}

	@PostMapping
	@PreAuthorize("hasRole('ADMIN')")
	public ResponseEntity<String> importExcel(@RequestParam("file") MultipartFile file) {
		try {
			excelService.importExcel(file);
			return ResponseEntity.ok("Import terminé avec succès");
		} catch (Exception e) {
			log.error(e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Erreur lors de l'import");
		}
	}



}
