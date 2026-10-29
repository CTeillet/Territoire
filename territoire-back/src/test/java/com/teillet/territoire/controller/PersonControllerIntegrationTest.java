package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.repository.PersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PersonControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private PersonRepository personRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() {
		personRepository.deleteAll();
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetAllPersons() throws Exception {
		Person person = Person.builder()
				.firstName("Alice")
				.lastName("Dupont")
				.build();
		personRepository.save(person);

		mockMvc.perform(get("/api/personnes"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].firstName").value("Alice"))
				.andExpect(jsonPath("$[0].lastName").value("Dupont"));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetAllPersons_User_SeesNamesOnly() throws Exception {
		personRepository.save(personWithContactDetails());

		mockMvc.perform(get("/api/personnes"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].firstName").value("Alice"))
				.andExpect(jsonPath("$[0].phoneNumber").doesNotExist())
				.andExpect(jsonPath("$[0].email").doesNotExist());
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void testGetAllPersons_Manager_SeesContactDetails() throws Exception {
		personRepository.save(personWithContactDetails());

		mockMvc.perform(get("/api/personnes"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].phoneNumber").value("+33612345678"))
				.andExpect(jsonPath("$[0].email").value("alice@example.com"));
	}

	/** Les attributions (territoires, historique d'une personne...) embarquent la personne : mêmes règles. */
	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testAssignmentJson_User_SeesNamesOnly() throws Exception {
		String json = objectMapper.writeValueAsString(AssignmentDto.builder().person(personWithContactDetails()).build());

		assertTrue(json.contains("\"firstName\":\"Alice\""), json);
		assertFalse(json.contains("+33612345678"), json);
		assertFalse(json.contains("alice@example.com"), json);
	}

	private static Person personWithContactDetails() {
		return Person.builder()
				.firstName("Alice")
				.lastName("Dupont")
				.phoneNumber("+33612345678")
				.email("alice@example.com")
				.build();
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testCreatePerson_Admin_Success() throws Exception {
		Person person = Person.builder()
				.firstName("Bob")
				.lastName("Martin")
				.build();

		mockMvc.perform(post("/api/personnes")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(person)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.firstName").value("Bob"))
				.andExpect(jsonPath("$.lastName").value("Martin"));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testCreatePerson_User_Forbidden() throws Exception {
		Person person = Person.builder()
				.firstName("Bob")
				.lastName("Martin")
				.build();

		mockMvc.perform(post("/api/personnes")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(person)))
				.andExpect(status().isForbidden());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void testModifyPerson() throws Exception {
		Person saved = personRepository.save(Person.builder()
				.firstName("Charlie")
				.lastName("Brown")
				.build());

		saved.setLastName("Chaplin");

		mockMvc.perform(put("/api/personnes/{id}", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(saved)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.lastName").value("Chaplin"));

		Person updated = personRepository.findById(saved.getId()).orElseThrow();
		assertEquals("Chaplin", updated.getLastName());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testDeletePerson() throws Exception {
		Person saved = personRepository.save(Person.builder()
				.firstName("David")
				.lastName("Guetta")
				.build());

		mockMvc.perform(delete("/api/personnes/{id}", saved.getId()))
				.andExpect(status().isOk());

		assertFalse(personRepository.findById(saved.getId()).isPresent());
	}
}
