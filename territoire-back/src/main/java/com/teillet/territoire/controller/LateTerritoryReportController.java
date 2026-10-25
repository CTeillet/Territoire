package com.teillet.territoire.controller;

import com.teillet.territoire.dto.LateReportSendResultDto;
import com.teillet.territoire.dto.LateReportSettingsDto;
import com.teillet.territoire.service.ILateTerritoryReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Récapitulatif hebdomadaire des territoires en retard, envoyé par e-mail.
 */
@Slf4j
@RestController
@RequestMapping("/api/settings/recapitulatif-retards")
@RequiredArgsConstructor
public class LateTerritoryReportController {
	private final ILateTerritoryReportService reportService;

	@GetMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public LateReportSettingsDto getSettings() {
		return reportService.getSettings();
	}

	@PutMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public LateReportSettingsDto updateSettings(@Valid @RequestBody LateReportSettingsDto settings) {
		return reportService.updateSettings(settings);
	}

	/** Envoi immédiat, pour vérifier la configuration sans attendre lundi. */
	@PostMapping("/envoi")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public LateReportSendResultDto send() {
		log.info("Envoi manuel du récapitulatif des retards");
		return reportService.sendReport();
	}
}
