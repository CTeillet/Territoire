package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AvailableTerritoryDto;
import com.teillet.territoire.dto.TerritoryRequestDto;
import com.teillet.territoire.service.ITerritoryRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Demandes de nouveau territoire faites depuis les liens personnels. On y répond en attribuant un territoire
 * (la demande est alors clôturée automatiquement) ou en la clôturant.
 */
@RestController
@RequestMapping("/api/demandes-territoire")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
public class TerritoryRequestController {
	private final ITerritoryRequestService territoryRequestService;

	@GetMapping
	public List<TerritoryRequestDto> getRequests(@RequestParam(defaultValue = "false") boolean historique) {
		return territoryRequestService.getRequests(historique);
	}

	@GetMapping("/en-attente/nombre")
	public long countPending() {
		return territoryRequestService.countPending();
	}

	@GetMapping("/{requestId}/territoires-disponibles")
	public List<AvailableTerritoryDto> getAvailableTerritories(@PathVariable UUID requestId) {
		return territoryRequestService.getAvailableTerritories(requestId);
	}

	@PostMapping("/{requestId}/cloture")
	public TerritoryRequestDto close(@PathVariable UUID requestId) {
		return territoryRequestService.close(requestId);
	}
}
