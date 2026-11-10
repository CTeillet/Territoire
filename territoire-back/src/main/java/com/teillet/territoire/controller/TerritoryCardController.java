package com.teillet.territoire.controller;

import com.teillet.territoire.service.impl.AuditService;
import com.teillet.territoire.enums.AuditAction;
import com.teillet.territoire.enums.CardFraming;
import com.teillet.territoire.record.CardMapLayout;
import com.teillet.territoire.service.ITerritoryCardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * Carte physique d'un territoire : formulaire « Carte de territoire » rempli, avec le plan du quartier. Le navigateur
 * dessine le plan (tuiles vectorielles IGN, thèmes au choix) sur l'emprise donnée ici et l'envoie : le back le pose
 * dans le cadre de la carte, avec le territoire en vert.
 */
@RestController
@RequestMapping("/api/territoires/{territoryId}/carte-physique")
@RequiredArgsConstructor
@Slf4j
class TerritoryCardController {
	private final ITerritoryCardService cardService;
	private final AuditService audit;

	/** Emprise du plan à dessiner pour ce cadrage. */
	@GetMapping("/emprise")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public CardMapLayout mapLayout(@PathVariable UUID territoryId,
								   @RequestParam(defaultValue = "NORMAL") CardFraming cadrage) {
		return cardService.mapLayout(territoryId, cadrage);
	}

	/** Aperçu de la carte avec le plan dessiné par le navigateur, sans rien enregistrer. */
	@PostMapping(path = "/apercu", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public ResponseEntity<byte[]> previewCard(@PathVariable UUID territoryId,
											  @RequestParam(defaultValue = "NORMAL") CardFraming cadrage,
											  @RequestParam("plan") MultipartFile plan) throws IOException {
		log.info("Aperçu de la carte physique du territoire {} (cadrage {})", territoryId, cadrage);
		return ResponseEntity.ok()
				.contentType(MediaType.IMAGE_PNG)
				.cacheControl(CacheControl.noStore())
				.body(cardService.renderCard(territoryId, cadrage, plan.getBytes()));
	}

	/** Génère la carte et remplace la carte du territoire (celle de la page « Impression des cartes »). */
	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public ResponseEntity<Void> saveCard(@PathVariable UUID territoryId,
										 @RequestParam(defaultValue = "NORMAL") CardFraming cadrage,
										 @RequestParam("plan") MultipartFile plan) throws IOException {
		log.info("Enregistrement de la carte physique du territoire {} (cadrage {})", territoryId, cadrage);
		cardService.saveCard(territoryId, cadrage, plan.getBytes());
		audit.territory(AuditAction.CARTE_REMPLACEE, territoryId, "Carte physique générée (cadrage " + cadrage + ")");
		return ResponseEntity.noContent().build();
	}
}
