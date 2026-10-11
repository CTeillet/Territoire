package com.teillet.territoire.controller;

import com.teillet.territoire.service.impl.TerritoryMapService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TerritoryPrintControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private TerritoryMapService territoryMapService;

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testExportPng_Authenticated() throws Exception {
		byte[] fakePng = new byte[]{1, 2, 3, 4};
		when(territoryMapService.generatePng(anyString(), anyString(), anyInt(), any(), anyInt(), anyBoolean()))
				.thenReturn(fakePng);

		UUID cityId = UUID.randomUUID();

		mockMvc.perform(get("/api/exports/territories.png")
						.param("paper", "A4")
						.param("orientation", "landscape")
						.param("dpi", "150")
						.param("cityId", cityId.toString())
						.param("zoom", "12")
						.param("showLabels", "true"))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE))
				.andExpect(content().bytes(fakePng));

		verify(territoryMapService).generatePng("A4", "landscape", 150, cityId, 12, true);
	}

	@Test
	void testExportPng_Unauthenticated_Forbidden() throws Exception {
		mockMvc.perform(get("/api/exports/territories.png"))
				.andExpect(status().isForbidden());
	}
}
