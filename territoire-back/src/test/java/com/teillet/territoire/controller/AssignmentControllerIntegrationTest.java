package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import com.teillet.territoire.dto.UpdateAssignmentDatesDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.service.IAssignmentService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
	@WithMockUser(roles = "GESTIONNAIRE")
	void testUpdateAssignmentDates() throws Exception {
		UUID assignmentId = UUID.randomUUID();
		AssignmentDto dto = AssignmentDto.builder()
				.id(assignmentId)
				.territory(SimplifiedTerritoryDto.builder().name("T3").status(TerritoryStatus.LATE).build())
				.assignmentDate(LocalDate.of(2026, 1, 5))
				.dueDate(LocalDate.of(2026, 5, 5))
				.build();
		when(assignmentService.updateAssignmentDates(eq(assignmentId), any())).thenReturn(dto);

		mockMvc.perform(put("/api/attributions/{id}", assignmentId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"assignmentDate\":\"2026-01-05\",\"dueDate\":\"2026-05-05\",\"returnDate\":null}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.territory.status").value("LATE"));

		ArgumentCaptor<UpdateAssignmentDatesDto> captor = ArgumentCaptor.forClass(UpdateAssignmentDatesDto.class);
		verify(assignmentService).updateAssignmentDates(eq(assignmentId), captor.capture());
		assertEquals(LocalDate.of(2026, 1, 5), captor.getValue().getAssignmentDate());
		assertEquals(LocalDate.of(2026, 5, 5), captor.getValue().getDueDate());
		assertNull(captor.getValue().getReturnDate());
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void testUpdateAssignmentDates_MissingOrInvalidDates_BadRequest() throws Exception {
		UUID assignmentId = UUID.randomUUID();
		mockMvc.perform(put("/api/attributions/{id}", assignmentId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"assignmentDate\":\"2026-01-05\"}"))
				.andExpect(status().isBadRequest());
		verify(assignmentService, never()).updateAssignmentDates(any(), any());

		when(assignmentService.updateAssignmentDates(eq(assignmentId), any()))
				.thenThrow(new IllegalArgumentException("La date de retour ne peut pas précéder la date d'attribution"));
		mockMvc.perform(put("/api/attributions/{id}", assignmentId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"assignmentDate\":\"2026-01-05\",\"dueDate\":\"2026-05-05\",\"returnDate\":\"2026-01-01\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").value("La date de retour ne peut pas précéder la date d'attribution"));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testUpdateAssignmentDates_User_Forbidden() throws Exception {
		mockMvc.perform(put("/api/attributions/{id}", UUID.randomUUID())
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"assignmentDate\":\"2026-01-05\",\"dueDate\":\"2026-05-05\"}"))
				.andExpect(status().isForbidden());

		verify(assignmentService, never()).updateAssignmentDates(any(), any());
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
