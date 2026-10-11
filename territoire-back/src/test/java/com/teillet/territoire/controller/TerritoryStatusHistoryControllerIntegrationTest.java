package com.teillet.territoire.controller;

import com.teillet.territoire.dto.TerritoryStatusHistoryDto;
import com.teillet.territoire.service.ITerritoryStatusHistoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TerritoryStatusHistoryControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ITerritoryStatusHistoryService territoryStatusHistoryService;

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetStatusHistory_Authenticated() throws Exception {
		TerritoryStatusHistoryDto dto = TerritoryStatusHistoryDto.builder()
				.date(LocalDate.of(2024, 1, 1))
				.availableTerritory(10)
				.assignedTerritory(5)
				.lateTerritory(2)
				.pendingTerritory(1)
				.build();

		when(territoryStatusHistoryService.getHistoryStatus(any(), any())).thenReturn(List.of(dto));

		mockMvc.perform(get("/api/territoires/statistiques")
						.param("startDate", "2024-01-01")
						.param("endDate", "2024-01-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].availableTerritory").value(10))
				.andExpect(jsonPath("$[0].assignedTerritory").value(5));

		verify(territoryStatusHistoryService).getHistoryStatus(LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31));
	}

	@Test
	void testGetStatusHistory_Unauthenticated_Forbidden() throws Exception {
		mockMvc.perform(get("/api/territoires/statistiques"))
				.andExpect(status().isForbidden());
	}
}
