package com.teillet.territoire.controller;

import com.teillet.territoire.model.Person;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.service.IWahaClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WhatsAppTestIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private PersonRepository personRepository;

	@MockitoBean
	private IWahaClient wahaClient;

	private Person person;

	@BeforeEach
	void setUp() {
		person = personRepository.save(Person.builder()
				.firstName("Alice")
				.lastName("Martin")
				.phoneNumber("+33612345678")
				.build());
	}

	@AfterEach
	void tearDown() {
		personRepository.delete(person);
	}

	private String body(Object personId, String message) {
		return "{\"personId\":\"" + personId + "\",\"message\":\"" + message + "\"}";
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void admin_envoieUnMessageDeTest() throws Exception {
		mockMvc.perform(post("/api/whatsapp/test")
						.contentType(MediaType.APPLICATION_JSON)
						.content(body(person.getId(), "Test")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sent").value(true))
				.andExpect(jsonPath("$.recipient").value("Alice Martin"))
				.andExpect(jsonPath("$.phoneNumber").value("+33612345678"));

		verify(wahaClient).sendMessage("+33612345678", "Test");
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void admin_voitLaCauseDeLEchec() throws Exception {
		doThrow(new RuntimeException("Erreur lors de l'envoi du message à WAHA",
				new IOException("WAHA error: 422")))
				.when(wahaClient).sendMessage(anyString(), anyString());

		mockMvc.perform(post("/api/whatsapp/test")
						.contentType(MediaType.APPLICATION_JSON)
						.content(body(person.getId(), "Test")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sent").value(false))
				.andExpect(jsonPath("$.error").value("IOException : WAHA error: 422"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void messageVide_refuse() throws Exception {
		mockMvc.perform(post("/api/whatsapp/test")
						.contentType(MediaType.APPLICATION_JSON)
						.content(body(person.getId(), " ")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").value("Le message ne peut pas être vide"));

		verifyNoInteractions(wahaClient);
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void horsAdmin_interdit() throws Exception {
		mockMvc.perform(post("/api/whatsapp/test")
						.contentType(MediaType.APPLICATION_JSON)
						.content(body(person.getId(), "Test")))
				.andExpect(status().isForbidden());

		verifyNoInteractions(wahaClient);
	}
}
