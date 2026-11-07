package com.teillet.territoire.controller;

import com.teillet.territoire.enums.CardFraming;
import com.teillet.territoire.service.ITerritoryCardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Carte physique d'un territoire : formulaire « Carte de territoire » rempli, avec le plan du quartier. */
@RestController
@RequestMapping("/api/territoires/{territoryId}/carte-physique")
@RequiredArgsConstructor
@Slf4j
class TerritoryCardController {
	private final ITerritoryCardService cardService;

	/** Aperçu de la carte, sans rien enregistrer. */
	@GetMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public ResponseEntity<byte[]> previewCard(@PathVariable UUID territoryId,
											  @RequestParam(defaultValue = "NORMAL") CardFraming cadrage) {
		log.info("Aperçu de la carte physique du territoire {} (cadrage {})", territoryId, cadrage);
		return ResponseEntity.ok()
				.contentType(MediaType.IMAGE_PNG)
				.cacheControl(CacheControl.noStore())
				.body(cardService.renderCard(territoryId, cadrage));
	}

	/** Génère la carte et remplace la carte du territoire (celle de la page « Impression des cartes »). */
	@PostMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public ResponseEntity<Void> saveCard(@PathVariable UUID territoryId,
										 @RequestParam(defaultValue = "NORMAL") CardFraming cadrage) {
		log.info("Enregistrement de la carte physique du territoire {} (cadrage {})", territoryId, cadrage);
		cardService.saveCard(territoryId, cadrage);
		return ResponseEntity.noContent().build();
	}
}
