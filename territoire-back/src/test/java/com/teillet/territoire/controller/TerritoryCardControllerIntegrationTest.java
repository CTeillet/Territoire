package com.teillet.territoire.controller;

import com.teillet.territoire.enums.CardFraming;
import com.teillet.territoire.service.ITerritoryCardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TerritoryCardControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ITerritoryCardService cardService;

	private final UUID territoryId = UUID.randomUUID();

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void previewCard_ReturnsThePng() throws Exception {
		byte[] fakePng = new byte[]{1, 2, 3, 4};
		when(cardService.renderCard(territoryId, CardFraming.NORMAL)).thenReturn(fakePng);

		mockMvc.perform(get("/api/territoires/{id}/carte-physique", territoryId))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG))
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(content().bytes(fakePng));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void previewCard_WithFraming() throws Exception {
		when(cardService.renderCard(territoryId, CardFraming.WIDE)).thenReturn(new byte[]{1});

		mockMvc.perform(get("/api/territoires/{id}/carte-physique", territoryId).param("cadrage", "WIDE"))
				.andExpect(status().isOk());

		verify(cardService).renderCard(territoryId, CardFraming.WIDE);
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void previewCard_TerritoryWithoutBlocks_ExplainsWhy() throws Exception {
		when(cardService.renderCard(territoryId, CardFraming.NORMAL))
				.thenThrow(new IllegalArgumentException("Ce territoire n'a pas encore de pâtés"));

		mockMvc.perform(get("/api/territoires/{id}/carte-physique", territoryId))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").value("Ce territoire n'a pas encore de pâtés"));
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void saveCard_StoresTheCard() throws Exception {
		mockMvc.perform(post("/api/territoires/{id}/carte-physique", territoryId).param("cadrage", "TIGHT"))
				.andExpect(status().isNoContent());

		verify(cardService).saveCard(territoryId, CardFraming.TIGHT);
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void card_ManagerCannotGenerate() throws Exception {
		mockMvc.perform(get("/api/territoires/{id}/carte-physique", territoryId))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/api/territoires/{id}/carte-physique", territoryId))
				.andExpect(status().isForbidden());

		verify(cardService, never()).saveCard(any(), any());
	}

	@Test
	void card_Unauthenticated_Unauthorized() throws Exception {
		mockMvc.perform(get("/api/territoires/{id}/carte-physique", territoryId))
				.andExpect(status().isUnauthorized());
	}
}
