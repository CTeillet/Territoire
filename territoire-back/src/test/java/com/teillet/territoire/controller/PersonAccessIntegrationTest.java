package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.enums.ReturnSource;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.AddressNotToDo;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.*;
import com.teillet.territoire.service.IPersonAccessService;
import com.teillet.territoire.service.ISettingService;
import com.teillet.territoire.service.IWahaClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class PersonAccessIntegrationTest {

	@Autowired private MockMvc mockMvc;
	@Autowired private ObjectMapper objectMapper;
	@Autowired private PersonAccessRepository personAccessRepository;
	@Autowired private TerritoryReminderRepository reminderRepository;
	@Autowired private AssignmentRepository assignmentRepository;
	@Autowired private AddressNotToDoRepository addressNotToDoRepository;
	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private PersonRepository personRepository;
	@Autowired private CityRepository cityRepository;
	@Autowired private IPersonAccessService personAccessService;
	@Autowired private ISettingService settingService;

	@MockitoBean
	private IWahaClient wahaClient;

	private Person person;
	private Territory territory;
	private Assignment assignment;

	@BeforeEach
	void setUp() {
		cleanUp();

		City city = new City();
		city.setName("Rennes");
		city.setZipCode("35000");
		city.setCenter(new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-1.67, 48.11)));
		city = cityRepository.save(city);

		person = personRepository.save(Person.builder().firstName("jean").lastName("DUPONT").phoneNumber("+33612345678").build());

		Territory t = new Territory();
		t.setName("R-12");
		t.setCity(city);
		t.setStatus(TerritoryStatus.ASSIGNED);
		t.setType(TerritoryType.HOUSE);
		t.setLastModifiedDate(LocalDate.now());
		territory = territoryRepository.save(t);

		addressNotToDoRepository.save(AddressNotToDo.builder()
				.territory(territory).number("12").street("rue des Lilas").zipCode("35000").city("Rennes").date(LocalDate.now()).build());

		assignment = assignmentRepository.save(Assignment.builder()
				.territory(territory).person(person)
				.assignmentDate(LocalDate.now().minusDays(10)).dueDate(LocalDate.now().plusMonths(3))
				.build());
	}

	@AfterEach
	void tearDown() {
		settingService.updateAccessSettings(AccessSettingsDto.builder().assignmentNotificationEnabled(false).build());
		cleanUp();
	}

	private void cleanUp() {
		personAccessRepository.deleteAll();
		reminderRepository.deleteAll();
		assignmentRepository.deleteAll();
		addressNotToDoRepository.deleteAll();
		territoryRepository.deleteAll();
		personRepository.deleteAll();
		cityRepository.deleteAll();
	}

	private String generateToken() {
		String link = personAccessService.regenerate(person.getId()).getLink();
		return link.substring(link.lastIndexOf('/') + 1);
	}

	@Test
	void publicView_ShowsOnlyCurrentTerritoriesWithAddresses() throws Exception {
		String token = generateToken();

		mockMvc.perform(get("/api/public/acces/{token}", token))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", containsStringIgnoringCase("no-store")))
				.andExpect(jsonPath("$.firstName").value("Jean"))
				.andExpect(jsonPath("$.territories.length()").value(1))
				.andExpect(jsonPath("$.territories[0].name").value("R-12"))
				.andExpect(jsonPath("$.territories[0].cityName").value("Rennes"))
				.andExpect(jsonPath("$.territories[0].late").value(false))
				.andExpect(jsonPath("$.territories[0].addressesNotToDo[0].street").value("rue des Lilas"))
				// Aucune donnée personnelle d'autres personnes ni de coordonnées
				.andExpect(jsonPath("$.phoneNumber").doesNotExist())
				.andExpect(jsonPath("$.territories[0].assignments").doesNotExist());

		assertNotNull(personAccessRepository.findByPerson_Id(person.getId()).orElseThrow().getLastUsedAt());
	}

	@Test
	void personReturnsTerritory_FromLink() throws Exception {
		String token = generateToken();

		mockMvc.perform(post("/api/public/acces/{token}/territoires/{territoryId}/retour", token, territory.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.territories.length()").value(0));

		Assignment returned = assignmentRepository.findById(assignment.getId()).orElseThrow();
		assertEquals(LocalDate.now(), returned.getReturnDate());
		assertEquals(ReturnSource.LIEN, returned.getReturnedVia());
		assertEquals(TerritoryStatus.PENDING, territoryRepository.findById(territory.getId()).orElseThrow().getStatus());
	}

	@Test
	void cannotReturnTerritoryAssignedToSomeoneElse() throws Exception {
		Person other = personRepository.save(Person.builder().firstName("Paul").lastName("Martin").build());
		String link = personAccessService.regenerate(other.getId()).getLink();
		String otherToken = link.substring(link.lastIndexOf('/') + 1);

		mockMvc.perform(post("/api/public/acces/{token}/territoires/{territoryId}/retour", otherToken, territory.getId()))
				.andExpect(status().isNotFound());

		assertNull(assignmentRepository.findById(assignment.getId()).orElseThrow().getReturnDate());
	}

	@Test
	void regeneratedOrRevokedOrExpiredLink_StopsWorking() throws Exception {
		String first = generateToken();
		String second = generateToken();

		mockMvc.perform(get("/api/public/acces/{token}", first)).andExpect(status().isNotFound());
		mockMvc.perform(get("/api/public/acces/{token}", second)).andExpect(status().isOk());

		personAccessService.updateExpiration(person.getId(), LocalDate.now().minusDays(1));
		mockMvc.perform(get("/api/public/acces/{token}", second)).andExpect(status().isNotFound());

		personAccessService.updateExpiration(person.getId(), null);
		mockMvc.perform(get("/api/public/acces/{token}", second)).andExpect(status().isOk());

		personAccessService.revoke(person.getId());
		mockMvc.perform(get("/api/public/acces/{token}", second)).andExpect(status().isNotFound());
	}

	@Test
	void invalidToken_NotFound() throws Exception {
		mockMvc.perform(get("/api/public/acces/{token}", "n-importe-quoi"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error").exists());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void management_RegenerateThenSendByWhatsApp() throws Exception {
		String body = mockMvc.perform(post("/api/personnes/{id}/acces/regenerer", person.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ACTIF"))
				.andReturn().getResponse().getContentAsString();
		String link = objectMapper.readTree(body).get("link").asText();
		assertTrue(link.startsWith("http://localhost:40000/m/"));

		mockMvc.perform(post("/api/personnes/{id}/acces/envoyer", person.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.lastSentAt").exists());

		verify(wahaClient).sendMessage(eq("+33612345678"), contains(link));
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void gestionnaire_CanReadAndSendButNotRegenerate() throws Exception {
		mockMvc.perform(get("/api/personnes/{id}/acces", person.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("AUCUN"))
				.andExpect(jsonPath("$.activeTerritories").value(1));
		mockMvc.perform(post("/api/personnes/{id}/acces/regenerer", person.getId()))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/api/personnes/{id}/acces/revoquer", person.getId()))
				.andExpect(status().isForbidden());
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void utilisateur_HasNoAccessToManagement() throws Exception {
		mockMvc.perform(get("/api/acces")).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/personnes/{id}/acces", person.getId())).andExpect(status().isForbidden());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void management_ListAllStatuses() throws Exception {
		generateToken();
		String body = mockMvc.perform(get("/api/acces"))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();
		JsonNode first = objectMapper.readTree(body).get(0);
		assertEquals("ACTIF", first.get("status").asText());
		assertEquals("Jean Dupont", first.get("personName").asText());
		assertEquals(1, first.get("activeTerritories").asInt());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void settings_InvalidTemplateRejected() throws Exception {
		mockMvc.perform(put("/api/settings/acces-numerique")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"assignmentNotificationEnabled\":true,\"assignmentMessage\":\"{% if %}\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void assignmentNotification_SentOnlyWhenEnabled() {
		personAccessService.notifyAssignment(assignment.getId());
		verify(wahaClient, never()).sendMessage(anyString(), anyString());

		settingService.updateAccessSettings(AccessSettingsDto.builder().assignmentNotificationEnabled(true).build());
		personAccessService.notifyAssignment(assignment.getId());

		verify(wahaClient).sendMessage(eq("+33612345678"), contains("R-12"));
		verify(wahaClient).sendMessage(eq("+33612345678"), contains("http://localhost:40000/m/"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void management_RevokeAndExpirationEndpoints() throws Exception {
		generateToken();

		mockMvc.perform(put("/api/personnes/{id}/acces/expiration", person.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"expiresAt\":\"2099-12-31\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.expiresAt").value("2099-12-31"))
				.andExpect(jsonPath("$.status").value("ACTIF"));

		mockMvc.perform(post("/api/personnes/{id}/acces/revoquer", person.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("REVOQUE"))
				.andExpect(jsonPath("$.link").doesNotExist());

		// Un lien révoqué ne peut pas être envoyé (409)
		mockMvc.perform(post("/api/personnes/{id}/acces/envoyer", person.getId()))
				.andExpect(status().isConflict());
		verify(wahaClient, never()).sendMessage(anyString(), anyString());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void settings_ReadAndUpdate() throws Exception {
		mockMvc.perform(get("/api/settings/acces-numerique"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.assignmentNotificationEnabled").value(false))
				.andExpect(jsonPath("$.assignmentMessage").value(org.hamcrest.Matchers.containsString("{{ link }}")));

		mockMvc.perform(put("/api/settings/acces-numerique")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"assignmentNotificationEnabled\":true,\"assignmentMessage\":\"Salut {{ person.firstName }}\",\"accessLinkMessage\":\"\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.assignmentNotificationEnabled").value(true))
				.andExpect(jsonPath("$.assignmentMessage").value("Salut {{ person.firstName }}"))
				// Un gabarit vide revient au message par défaut
				.andExpect(jsonPath("$.accessLinkMessage").value(org.hamcrest.Matchers.containsString("{{ link }}")));
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void settings_ForbiddenForGestionnaire() throws Exception {
		mockMvc.perform(get("/api/settings/acces-numerique")).andExpect(status().isForbidden());
	}

	private static org.hamcrest.Matcher<String> containsStringIgnoringCase(String value) {
		return org.hamcrest.Matchers.containsStringIgnoringCase(value);
	}
}
