package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.model.Setting;
import com.teillet.territoire.repository.SettingRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SettingControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private SettingRepository settingRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() {
		settingRepository.deleteAll();
		settingRepository.save(Setting.builder()
				.publishersCount(30)
				.lateReminderMessage("Rappel standard")
				.build());
	}

	/** Base H2 partagée : des durées réglées ici ne doivent pas changer les échéances des autres tests. */
	@AfterEach
	void cleanUp() {
		settingRepository.deleteAll();
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetPublishersCountAndLateReminderMessage() throws Exception {
		mockMvc.perform(get("/api/settings/publishers-count"))
				.andExpect(status().isOk())
				.andExpect(content().string("30"));

		mockMvc.perform(get("/api/settings/late-reminder-message"))
				.andExpect(status().isOk())
				.andExpect(content().string("Rappel standard"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testUpdatePublishersCount() throws Exception {
		mockMvc.perform(put("/api/settings/publishers-count")
						.contentType(MediaType.APPLICATION_JSON)
						.content("45"))
				.andExpect(status().isOk())
				.andExpect(content().string("45"));

		mockMvc.perform(put("/api/settings/publishers-count")
						.contentType(MediaType.APPLICATION_JSON)
						.content("-5"))
				.andExpect(status().isBadRequest());
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void testGetDurationSettings_DefaultsReadableByAll() throws Exception {
		mockMvc.perform(get("/api/settings/durees"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.assignmentDurationMonths").value(4))
				.andExpect(jsonPath("$.pendingDurationMonths").value(4));

		// Le réglage reste réservé à l'ADMIN et au SUPERVISEUR
		mockMvc.perform(put("/api/settings/durees")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"assignmentDurationMonths\":3,\"pendingDurationMonths\":6}"))
				.andExpect(status().isForbidden());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void testUpdateDurationSettings() throws Exception {
		mockMvc.perform(put("/api/settings/durees")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"assignmentDurationMonths\":3,\"pendingDurationMonths\":6}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.assignmentDurationMonths").value(3))
				.andExpect(jsonPath("$.pendingDurationMonths").value(6));

		Setting saved = settingRepository.findAll().getFirst();
		assertEquals(3, saved.getAssignmentDurationMonths());
		assertEquals(6, saved.getPendingDurationMonths());

		mockMvc.perform(put("/api/settings/durees")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"assignmentDurationMonths\":0,\"pendingDurationMonths\":6}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").value("La durée d'attribution doit être d'au moins 1 mois"));
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void testUpdateLateReminderMessage() throws Exception {
		mockMvc.perform(put("/api/settings/late-reminder-message")
						.contentType(MediaType.APPLICATION_JSON)
						.content("Nouveau message"))
				.andExpect(status().isOk())
				.andExpect(content().string("Nouveau message"));
	}
}
