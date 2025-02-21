package com.teillet.territoire.controller;

import com.teillet.territoire.dto.BlockDto;
import com.teillet.territoire.model.Block;
import com.teillet.territoire.service.BlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/territories/{territoryId}/blocks")
@RequiredArgsConstructor
public class BlockController {
	private final BlockService blockService;

	@PostMapping
	public Block addBlock(@PathVariable UUID territoryId, @RequestBody BlockDto block) {
		return blockService.addBlockToTerritory(territoryId, block);
	}

	@DeleteMapping("/{blockId}")
	public void deleteBlock(@PathVariable UUID territoryId, @PathVariable UUID blockId) {
		blockService.removeBlockTerritory(territoryId, blockId);
	}
 }
