package com.teillet.territoire.service;

import com.teillet.territoire.dto.BlockDto;
import com.teillet.territoire.model.Block;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.BlockRepository;
import com.teillet.territoire.service.impl.BlockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BlockServiceTest {

	@Mock
	private ITerritoryService territoryService;

	@Mock
	private BlockRepository blockRepository;

	private BlockService blockService;

	@BeforeEach
	void setUp() {
		blockService = new BlockService(territoryService, blockRepository);
	}

	@Test
	void testAddBlockToTerritory() {
		UUID territoryId = UUID.randomUUID();
		Territory territory = new Territory();
		territory.setId(territoryId);

		BlockDto blockDto = new BlockDto();
		blockDto.setCoordinates(List.of(List.of(
				List.of(2.3522, 48.8566),
				List.of(2.3622, 48.8566),
				List.of(2.3622, 48.8666),
				List.of(2.3522, 48.8666),
				List.of(2.3522, 48.8566)
		)));

		when(territoryService.getTerritory(territoryId)).thenReturn(territory);
		when(blockRepository.save(any(Block.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Block savedBlock = blockService.addBlockToTerritory(territoryId, blockDto);
		assertNotNull(savedBlock);
		assertEquals(territory, savedBlock.getTerritory());
		assertNotNull(savedBlock.getBlock());

		verify(territoryService, times(1)).updateConcaveHull(territoryId);
	}

	@Test
	void testRemoveBlockTerritory() {
		UUID territoryId = UUID.randomUUID();
		UUID blockId = UUID.randomUUID();

		doNothing().when(blockRepository).deleteByIdAndTerritory_Id(blockId, territoryId);

		blockService.removeBlockTerritory(territoryId, blockId);

		verify(blockRepository, times(1)).deleteByIdAndTerritory_Id(blockId, territoryId);
		verify(territoryService, times(1)).updateConcaveHull(territoryId);
	}
}
