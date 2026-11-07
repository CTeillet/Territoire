package com.teillet.territoire.controller;

import com.teillet.territoire.enums.CardFraming;
import com.teillet.territoire.record.CardMapLayout;
import com.teillet.territoire.service.ITerritoryCardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TerritoryCardControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ITerritoryCardService cardService;

	private final UUID territoryId = UUID.randomUUID();
	private final byte[] planBytes = new byte[]{9, 8, 7};
	private final MockMultipartFile plan = new MockMultipartFile("plan", "plan.png", "image/png", planBytes);

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void mapLayout_GivesTheExtentToDraw() throws Exception {
		when(cardService.mapLayout(territoryId, CardFraming.WIDE))
				.thenReturn(new CardMapLayout(2.35, 48.69, 2.37, 48.70, 828, 376));

		mockMvc.perform(get("/api/territoires/{id}/carte-physique/emprise", territoryId).param("cadrage", "WIDE"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.west").value(2.35))
				.andExpect(jsonPath("$.north").value(48.70))
				.andExpect(jsonPath("$.width").value(828))
				.andExpect(jsonPath("$.height").value(376));
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void mapLayout_TerritoryWithoutBlocks_ExplainsWhy() throws Exception {
		when(cardService.mapLayout(territoryId, CardFraming.NORMAL))
				.thenThrow(new IllegalArgumentException("Ce territoire n'a pas encore de pâtés"));

		mockMvc.perform(get("/api/territoires/{id}/carte-physique/emprise", territoryId))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").value("Ce territoire n'a pas encore de pâtés"));
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void previewCard_ReturnsThePngWithThePlan() throws Exception {
		byte[] fakePng = new byte[]{1, 2, 3, 4};
		when(cardService.renderCard(eq(territoryId), eq(CardFraming.TIGHT), eq(planBytes))).thenReturn(fakePng);

		mockMvc.perform(multipart("/api/territoires/{id}/carte-physique/apercu", territoryId).file(plan).param("cadrage", "TIGHT"))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG))
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(content().bytes(fakePng));
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void previewCard_WithoutPlan_BadRequest() throws Exception {
		mockMvc.perform(multipart("/api/territoires/{id}/carte-physique/apercu", territoryId))
				.andExpect(status().isBadRequest());

		verifyNoInteractions(cardService);
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void saveCard_StoresTheCardWithThePlan() throws Exception {
		mockMvc.perform(multipart("/api/territoires/{id}/carte-physique", territoryId).file(plan))
				.andExpect(status().isNoContent());

		verify(cardService).saveCard(eq(territoryId), eq(CardFraming.NORMAL), eq(planBytes));
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void card_ManagerCannotGenerate() throws Exception {
		mockMvc.perform(get("/api/territoires/{id}/carte-physique/emprise", territoryId))
				.andExpect(status().isForbidden());
		mockMvc.perform(multipart("/api/territoires/{id}/carte-physique/apercu", territoryId).file(plan))
				.andExpect(status().isForbidden());
		mockMvc.perform(multipart("/api/territoires/{id}/carte-physique", territoryId).file(plan))
				.andExpect(status().isForbidden());

		verify(cardService, never()).saveCard(any(), any(), any());
	}

	@Test
	void card_Unauthenticated_Unauthorized() throws Exception {
		mockMvc.perform(get("/api/territoires/{id}/carte-physique/emprise", territoryId))
				.andExpect(status().isUnauthorized());
	}
}
