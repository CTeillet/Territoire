package com.teillet.territoire.controller;

import com.teillet.territoire.dto.TerritoryStatusSummaryDto;
import com.teillet.territoire.service.ITerritoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints des intégrations externes, authentifiés par clé d'API (cf. ApiKeyAuthenticationFilter).
 * Ils ne renvoient que des agrégats.
 */
@RestController
@RequestMapping("/api/integrations")
@RequiredArgsConstructor
public class IntegrationController {
	private final ITerritoryService territoryService;

	/** Compteurs des territoires par statut (en retard, attribués, disponibles, en attente). */
	@GetMapping("/resume")
	public TerritoryStatusSummaryDto getSummary() {
		return territoryService.getStatusSummary();
	}
}
