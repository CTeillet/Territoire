package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.model.Setting;
import com.teillet.territoire.repository.SettingRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
	@WithMockUser(roles = "SUPERVISEUR")
	void testUpdateLateReminderMessage() throws Exception {
		mockMvc.perform(put("/api/settings/late-reminder-message")
						.contentType(MediaType.APPLICATION_JSON)
						.content("Nouveau message"))
				.andExpect(status().isOk())
				.andExpect(content().string("Nouveau message"));
	}
}
