package com.teillet.territoire.controller;

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

@RestController
@RequestMapping("/api/excel")
@RequiredArgsConstructor
@Slf4j
public class ExcelController {

	private final IExcelService excelService;

	@GetMapping
	public ResponseEntity<byte[]> exportExcel(@RequestParam(value = "year", required = false) Integer year) {
		try {
			byte[] content = excelService.exportExcel(year);
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
			headers.setContentDispositionFormData("attachment", "territoires.xlsx");
			return new ResponseEntity<>(content, headers, HttpStatus.OK);
		} catch (Exception e) {
			log.error("Erreur lors de l'export Excel", e);
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
