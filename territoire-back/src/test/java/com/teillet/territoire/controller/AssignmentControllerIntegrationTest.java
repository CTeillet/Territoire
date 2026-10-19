package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.service.IAssignmentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AssignmentControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private IAssignmentService assignmentService;

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetLastAssignments() throws Exception {
		AssignmentDto dto = AssignmentDto.builder()
				.id(UUID.randomUUID())
				.territory(SimplifiedTerritoryDto.builder().name("T1").build())
				.person(Person.builder().firstName("John").lastName("Doe").build())
				.build();
		when(assignmentService.getLastAssignments()).thenReturn(List.of(dto));

		mockMvc.perform(get("/api/attributions/dernieres"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].territory.name").value("T1"))
				.andExpect(jsonPath("$[0].person.firstName").value("John"));

		verify(assignmentService).getLastAssignments();
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetAssignmentsInPeriod() throws Exception {
		AssignmentDto dto = AssignmentDto.builder()
				.id(UUID.randomUUID())
				.territory(SimplifiedTerritoryDto.builder().name("T2").build())
				.person(Person.builder().firstName("Jane").lastName("Doe").build())
				.build();
		when(assignmentService.getAssignmentsInPeriod(any(), any())).thenReturn(List.of(dto));

		mockMvc.perform(get("/api/attributions/periode")
						.param("startDate", "2024-01-01")
						.param("endDate", "2024-06-30"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].territory.name").value("T2"));

		verify(assignmentService).getAssignmentsInPeriod(LocalDate.of(2024, 1, 1), LocalDate.of(2024, 6, 30));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testCheckLate() throws Exception {
		mockMvc.perform(put("/api/attributions/verification-retard"))
				.andExpect(status().isOk());

		verify(assignmentService).checkOverdueAssignments();
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testCheckLate_User_Forbidden() throws Exception {
		mockMvc.perform(put("/api/attributions/verification-retard"))
				.andExpect(status().isForbidden());

		verify(assignmentService, never()).checkOverdueAssignments();
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testMassDeletion_NoLongerExists() throws Exception {
		// La suppression de masse de l'historique des attributions a été retirée, y compris pour l'ADMIN
		mockMvc.perform(delete("/api/attributions"))
				.andExpect(status().is4xxClientError());
		mockMvc.perform(delete("/api/attributions/{city}", "Rennes"))
				.andExpect(status().is4xxClientError());
	}
}
