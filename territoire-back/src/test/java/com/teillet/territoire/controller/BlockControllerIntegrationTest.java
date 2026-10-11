package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.BlockDto;
import com.teillet.territoire.model.Block;
import com.teillet.territoire.service.IBlockService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class BlockControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockitoBean
	private IBlockService blockService;

	@Test
	@WithMockUser(roles = "ADMIN")
	void testAddBlock_Admin_Success() throws Exception {
		UUID territoryId = UUID.randomUUID();
		BlockDto dto = new BlockDto();
		dto.setCoordinates(List.of(List.of(List.of(2.3522, 48.8566))));

		Block mockBlock = Block.builder().id(UUID.randomUUID()).build();
		when(blockService.addBlockToTerritory(eq(territoryId), any(BlockDto.class))).thenReturn(mockBlock);

		mockMvc.perform(post("/api/territoires/{territoryId}/pate", territoryId)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isOk());

		verify(blockService).addBlockToTerritory(eq(territoryId), any(BlockDto.class));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testAddBlock_UserRole_Forbidden() throws Exception {
		UUID territoryId = UUID.randomUUID();
		BlockDto dto = new BlockDto();

		mockMvc.perform(post("/api/territoires/{territoryId}/pate", territoryId)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isForbidden());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void testDeleteBlock_Superviseur_Success() throws Exception {
		UUID territoryId = UUID.randomUUID();
		UUID blockId = UUID.randomUUID();

		doNothing().when(blockService).removeBlockTerritory(territoryId, blockId);

		mockMvc.perform(delete("/api/territoires/{territoryId}/pate/{blockId}", territoryId, blockId))
				.andExpect(status().isOk());

		verify(blockService).removeBlockTerritory(territoryId, blockId);
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testDeleteBlock_Exception_InternalServerError() throws Exception {
		UUID territoryId = UUID.randomUUID();
		UUID blockId = UUID.randomUUID();

		doThrow(new RuntimeException("Database error")).when(blockService).removeBlockTerritory(territoryId, blockId);

		mockMvc.perform(delete("/api/territoires/{territoryId}/pate/{blockId}", territoryId, blockId))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.error").value("Erreur interne"));
	}
}
