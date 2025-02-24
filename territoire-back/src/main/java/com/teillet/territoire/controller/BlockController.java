package com.teillet.territoire.controller;

import com.teillet.territoire.dto.BlockDto;
import com.teillet.territoire.model.Block;
import com.teillet.territoire.service.IBlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/territories/{territoryId}/blocks")
@RequiredArgsConstructor
public class BlockController {
	private final IBlockService blockService;

	@PostMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public Block addBlock(@PathVariable UUID territoryId, @RequestBody BlockDto block) {
		return blockService.addBlockToTerritory(territoryId, block);
	}

	@DeleteMapping("/{blockId}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void deleteBlock(@PathVariable UUID territoryId, @PathVariable UUID blockId) {
		blockService.removeBlockTerritory(territoryId, blockId);
	}
 }
