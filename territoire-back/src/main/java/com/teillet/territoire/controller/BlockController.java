package com.teillet.territoire.controller;

import com.teillet.territoire.dto.BlockDto;
import com.teillet.territoire.model.Block;
import com.teillet.territoire.service.IBlockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/territoires/{territoryId}/pate")
@RequiredArgsConstructor
@Slf4j
public class BlockController {
	private final IBlockService blockService;

	// 🔹 Ajout d'un block
	@PostMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public ResponseEntity<Void> addBlock(@PathVariable UUID territoryId, @RequestBody BlockDto block) {
		log.info("📌 Demande d'ajout d'un block au territoire {} : {}", territoryId, block);

		Block newBlock = blockService.addBlockToTerritory(territoryId, block);

		log.info("✅ Block ajouté avec succès : {}", newBlock);
		return ResponseEntity.ok().build();
	}

	// 🔹 Suppression d'un block
	@DeleteMapping("/{blockId}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public ResponseEntity<?> deleteBlock(@PathVariable UUID territoryId, @PathVariable UUID blockId) {
		log.info("🗑️ Demande de suppression du block {} du territoire {}", blockId, territoryId);

		try {
			blockService.removeBlockTerritory(territoryId, blockId);
			log.info("✅ Block {} supprimé du territoire {}", blockId, territoryId);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			log.error("❌ Erreur lors de la suppression du block {} du territoire {} : {}", blockId, territoryId, e.getMessage());
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Erreur interne"));
		}
	}
}

