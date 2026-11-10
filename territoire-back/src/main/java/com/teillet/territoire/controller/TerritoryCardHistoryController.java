package com.teillet.territoire.controller;

import com.teillet.territoire.service.impl.AuditService;
import com.teillet.territoire.enums.AuditAction;
import com.teillet.territoire.dto.TerritoryMapVersionDto;
import com.teillet.territoire.model.TerritoryMapVersion;
import com.teillet.territoire.service.ITerritoryCardHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Cartes précédentes d'un territoire (remplacées par une carte physique générée ou importée), pour ceux qui gèrent
 * les cartes : les revoir et en remettre une.
 */
@RestController
@RequestMapping("/api/territoires/{territoryId}/cartes-precedentes")
@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
@RequiredArgsConstructor
@Slf4j
class TerritoryCardHistoryController {
	private final ITerritoryCardHistoryService historyService;
	private final AuditService audit;

	@GetMapping
	public List<TerritoryMapVersionDto> list(@PathVariable UUID territoryId) {
		return historyService.list(territoryId);
	}

	/** Image d'une carte précédente, servie comme la carte actuelle (même protection contre un contenu actif). */
	@GetMapping("/{versionId}")
	public ResponseEntity<byte[]> image(@PathVariable UUID territoryId, @PathVariable UUID versionId) {
		TerritoryMapVersion version = historyService.get(territoryId, versionId);
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(version.getContentType() != null
				? MediaType.parseMediaType(version.getContentType())
				: MediaType.APPLICATION_OCTET_STREAM);
		headers.set(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
				.filename(version.getFileName() != null ? version.getFileName() : "carte").build().toString());
		headers.set("X-Content-Type-Options", "nosniff");
		headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
		headers.setCacheControl(CacheControl.noStore());
		return ResponseEntity.ok().headers(headers).body(version.getContent());
	}

	/** Remet cette carte ; la carte actuelle rejoint les cartes précédentes. */
	@PostMapping("/{versionId}/restauration")
	public ResponseEntity<Void> restore(@PathVariable UUID territoryId, @PathVariable UUID versionId) {
		log.info("Remise de la carte précédente {} du territoire {}", versionId, territoryId);
		historyService.restore(territoryId, versionId);
		audit.territory(AuditAction.CARTE_REMISE, territoryId, "Carte précédente remise");
		return ResponseEntity.noContent().build();
	}
}
