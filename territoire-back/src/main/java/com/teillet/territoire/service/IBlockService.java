package com.teillet.territoire.service;

import com.teillet.territoire.dto.BlockDto;
import com.teillet.territoire.model.Block;
import jakarta.transaction.Transactional;

import java.util.UUID;

public interface IBlockService {
	@Transactional
	Block addBlockToTerritory(UUID territoryId, BlockDto blockDTO);

	@Transactional
	void removeBlockTerritory(UUID territoryId, UUID blockId);
}
