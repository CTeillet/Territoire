package com.teillet.territoire.controller;


import com.teillet.territoire.model.City;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.service.IExcelExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/excel")
@RequiredArgsConstructor
public class ExcelExportController {

	private final CityRepository cityRepository;
	private final IExcelExportService excelExportService;


	@GetMapping("/telecharger")
	public ResponseEntity<byte[]> downloadExcel() {
		try {
			// Récupérer toutes les villes avec leurs territoires et affectations
			List<City> cities = cityRepository.findAll();

			// Générer l'Excel en mémoire
			ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
			excelExportService.generateExcel(cities, outputStream);

			// Préparer la réponse HTTP
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
			headers.setContentDispositionFormData("attachment", "territoires.xlsx");

			return new ResponseEntity<>(outputStream.toByteArray(), headers, HttpStatus.OK);
		} catch (IOException e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
		}
	}
}
