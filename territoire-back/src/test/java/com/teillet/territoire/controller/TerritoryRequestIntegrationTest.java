package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.enums.TerritoryRequestStatus;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.model.TerritoryRequest;
import com.teillet.territoire.repository.*;
import com.teillet.territoire.service.IPersonAccessService;
import com.teillet.territoire.service.IPersonService;
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

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TerritoryRequestIntegrationTest {
	private static final String MANAGER_PHONE = "+33700000000";

	@Autowired private MockMvc mockMvc;
	@Autowired private ObjectMapper objectMapper;
	@Autowired private TerritoryRequestRepository requestRepository;
	@Autowired private PersonAccessRepository personAccessRepository;
	@Autowired private TerritoryReminderRepository reminderRepository;
	@Autowired private AddressNotToDoRepository addressNotToDoRepository;
	@Autowired private AssignmentRepository assignmentRepository;
	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private PersonRepository personRepository;
	@Autowired private CityRepository cityRepository;
	@Autowired private IPersonAccessService personAccessService;
	@Autowired private IPersonService personService;
	@Autowired private ISettingService settingService;

	@MockitoBean
	private IWahaClient wahaClient;

	private Person person;
	private City rennes;
	private City brest;
	private Territory neverVisited;
	private Territory visitedLongAgo;
	private String token;

	@BeforeEach
	void setUp() {
		cleanUp();
		GeometryFactory factory = new GeometryFactory(new PrecisionModel(), 4326);
		rennes = cityRepository.save(City.builder().name("Rennes").zipCode("35000").center(factory.createPoint(new Coordinate(-1.67, 48.11))).build());
		brest = cityRepository.save(City.builder().name("Brest").zipCode("29200").center(factory.createPoint(new Coordinate(-4.48, 48.39))).build());
		// Ville sans territoire : pas proposée dans la demande
		cityRepository.save(City.builder().name("Vannes").zipCode("56000").center(factory.createPoint(new Coordinate(-2.76, 47.66))).build());

		person = personRepository.save(Person.builder().firstName("jean").lastName("DUPONT").phoneNumber("+33612345678").build());
		neverVisited = territory("R-2", rennes, TerritoryStatus.AVAILABLE);
		visitedLongAgo = territory("R-1", rennes, TerritoryStatus.AVAILABLE);
		territory("R-3", rennes, TerritoryStatus.ASSIGNED);
		territory("B-1", brest, TerritoryStatus.AVAILABLE);
		assignmentRepository.save(Assignment.builder().territory(visitedLongAgo)
				.assignmentDate(LocalDate.now().minusYears(2)).dueDate(LocalDate.now().minusYears(2).plusMonths(4))
				.returnDate(LocalDate.now().minusYears(1)).build());

		String link = personAccessService.regenerate(person.getId()).getLink();
		token = link.substring(link.lastIndexOf('/') + 1);
	}

	@AfterEach
	void tearDown() {
		settingService.updateAccessSettings(AccessSettingsDto.builder().assignmentNotificationEnabled(false).build());
		cleanUp();
	}

	private void cleanUp() {
		requestRepository.deleteAll();
		personAccessRepository.deleteAll();
		reminderRepository.deleteAll();
		assignmentRepository.deleteAll();
		addressNotToDoRepository.deleteAll();
		territoryRepository.deleteAll();
		personRepository.deleteAll();
		cityRepository.deleteAll();
	}

	private Territory territory(String name, City city, TerritoryStatus status) {
		Territory territory = new Territory();
		territory.setName(name);
		territory.setCity(city);
		territory.setStatus(status);
		territory.setType(TerritoryType.HOUSE);
		territory.setLastModifiedDate(LocalDate.now());
		return territoryRepository.save(territory);
	}

	private String requestBody(UUID cityId, String comment) throws Exception {
		var body = objectMapper.createObjectNode();
		body.put("cityId", cityId != null ? cityId.toString() : null);
		body.put("comment", comment);
		return objectMapper.writeValueAsString(body);
	}

	private void createRequest(UUID cityId, String comment) throws Exception {
		mockMvc.perform(post("/api/public/acces/{token}/demandes", token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(requestBody(cityId, comment)))
				.andExpect(status().isOk());
	}

	private TerritoryRequest onlyRequest() {
		assertEquals(1, requestRepository.count());
		return requestRepository.findAll().getFirst();
	}

	@Test
	void publicView_ProposesCitiesWithTerritories() throws Exception {
		mockMvc.perform(get("/api/public/acces/{token}", token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.cities.length()").value(2))
				.andExpect(jsonPath("$.cities[0].name").value("Brest"))
				.andExpect(jsonPath("$.cities[1].name").value("Rennes"))
				.andExpect(jsonPath("$.pendingRequest").isEmpty());
	}

	@Test
	void personRequestsTerritory_ManagerIsNotifiedByWhatsApp() throws Exception {
		settingService.updateAccessSettings(AccessSettingsDto.builder().territoryRequestPhone(MANAGER_PHONE).build());

		mockMvc.perform(post("/api/public/acces/{token}/demandes", token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(requestBody(rennes.getId(), "  Plutôt près de la gare  ")))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsStringIgnoringCase("no-store")))
				.andExpect(jsonPath("$.pendingRequest.cityName").value("Rennes"))
				.andExpect(jsonPath("$.pendingRequest.comment").value("Plutôt près de la gare"))
				.andExpect(jsonPath("$.pendingRequest.createdAt").exists());

		TerritoryRequest request = onlyRequest();
		assertEquals(TerritoryRequestStatus.EN_ATTENTE, request.getStatus());
		// Message envoyé en tâche de fond après validation
		verify(wahaClient, timeout(5000)).sendMessage(eq(MANAGER_PHONE), contains("Jean Dupont"));
		verify(wahaClient).sendMessage(eq(MANAGER_PHONE), contains("Ville : Rennes"));
		verify(wahaClient).sendMessage(eq(MANAGER_PHONE), contains("Plutôt près de la gare"));
		verify(wahaClient).sendMessage(eq(MANAGER_PHONE), contains("http://localhost:40000/demandes"));
	}

	@Test
	void requestWithoutCityOrComment_NoNotificationWithoutPhone() throws Exception {
		mockMvc.perform(post("/api/public/acces/{token}/demandes", token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.pendingRequest.cityName").isEmpty())
				.andExpect(jsonPath("$.pendingRequest.comment").isEmpty());

		assertNull(onlyRequest().getCity());
		verify(wahaClient, after(300).never()).sendMessage(anyString(), anyString());
	}

	@Test
	void onlyOnePendingRequest_ThenCancelAndRetry() throws Exception {
		createRequest(rennes.getId(), null);

		mockMvc.perform(post("/api/public/acces/{token}/demandes", token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(requestBody(brest.getId(), null)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("déjà une demande en attente")));

		UUID requestId = onlyRequest().getId();
		mockMvc.perform(post("/api/public/acces/{token}/demandes/{id}/annulation", token, requestId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.pendingRequest").isEmpty());
		TerritoryRequest cancelled = requestRepository.findById(requestId).orElseThrow();
		assertEquals(TerritoryRequestStatus.ANNULEE, cancelled.getStatus());
		assertNotNull(cancelled.getClosedAt());

		// Déjà annulée : plus rien à annuler
		mockMvc.perform(post("/api/public/acces/{token}/demandes/{id}/annulation", token, requestId))
				.andExpect(status().isConflict());

		createRequest(brest.getId(), null);
	}

	@Test
	void tooManyRequestsInADay_Refused() throws Exception {
		for (int i = 0; i < 3; i++) {
			requestRepository.save(TerritoryRequest.builder().person(person).status(TerritoryRequestStatus.ANNULEE)
					.createdAt(Instant.now().minusSeconds(60)).closedAt(Instant.now()).build());
		}

		mockMvc.perform(post("/api/public/acces/{token}/demandes", token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("demain")));
	}

	@Test
	void invalidRequests_Rejected() throws Exception {
		mockMvc.perform(post("/api/public/acces/{token}/demandes", token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(requestBody(UUID.randomUUID(), null)))
				.andExpect(status().isBadRequest());
		mockMvc.perform(post("/api/public/acces/{token}/demandes", token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(requestBody(null, "x".repeat(501))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").value("Le commentaire ne doit pas dépasser 500 caractères"));
		mockMvc.perform(post("/api/public/acces/{token}/demandes", "lien-invalide")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isNotFound());

		assertEquals(0, requestRepository.count());
	}

	@Test
	void cannotCancelSomeoneElsesRequest() throws Exception {
		createRequest(rennes.getId(), null);
		UUID requestId = onlyRequest().getId();
		Person other = personRepository.save(Person.builder().firstName("Paul").lastName("Martin").build());
		String otherLink = personAccessService.regenerate(other.getId()).getLink();

		mockMvc.perform(post("/api/public/acces/{token}/demandes/{id}/annulation",
						otherLink.substring(otherLink.lastIndexOf('/') + 1), requestId))
				.andExpect(status().isNotFound());

		assertEquals(TerritoryRequestStatus.EN_ATTENTE, requestRepository.findById(requestId).orElseThrow().getStatus());
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void manager_AssignsTerritoryFromRequest_RequestClosedAutomatically() throws Exception {
		createRequest(rennes.getId(), "Plutôt près de la gare");
		UUID requestId = onlyRequest().getId();

		mockMvc.perform(get("/api/demandes-territoire/en-attente/nombre"))
				.andExpect(status().isOk())
				.andExpect(content().string("1"));
		mockMvc.perform(get("/api/demandes-territoire"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].personName").value("Jean Dupont"))
				.andExpect(jsonPath("$[0].cityName").value("Rennes"))
				.andExpect(jsonPath("$[0].comment").value("Plutôt près de la gare"))
				.andExpect(jsonPath("$[0].status").value("EN_ATTENTE"))
				.andExpect(jsonPath("$[0].activeTerritories").value(0));

		// Seulement les territoires disponibles de la ville, jamais parcourus d'abord
		mockMvc.perform(get("/api/demandes-territoire/{id}/territoires-disponibles", requestId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].name").value("R-2"))
				.andExpect(jsonPath("$[0].lastReturnDate").isEmpty())
				.andExpect(jsonPath("$[1].name").value("R-1"))
				.andExpect(jsonPath("$[1].lastReturnDate").value(LocalDate.now().minusYears(1).toString()));

		mockMvc.perform(post("/api/territoires/{territoryId}/attribuer/{personId}", neverVisited.getId(), person.getId()))
				.andExpect(status().isOk());

		TerritoryRequest request = requestRepository.findById(requestId).orElseThrow();
		assertEquals(TerritoryRequestStatus.ATTRIBUEE, request.getStatus());
		assertNotNull(request.getClosedAt());
		mockMvc.perform(get("/api/demandes-territoire/en-attente/nombre")).andExpect(content().string("0"));
		mockMvc.perform(get("/api/demandes-territoire")).andExpect(jsonPath("$.length()").value(0));
		mockMvc.perform(get("/api/demandes-territoire").param("historique", "true"))
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].status").value("ATTRIBUEE"))
				.andExpect(jsonPath("$[0].territoryName").value("R-2"))
				.andExpect(jsonPath("$[0].activeTerritories").value(1));
		mockMvc.perform(get("/api/public/acces/{token}", token))
				.andExpect(jsonPath("$.pendingRequest").isEmpty())
				.andExpect(jsonPath("$.territories[0].name").value("R-2"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void requestWithoutCity_ProposesAllAvailableTerritories() throws Exception {
		createRequest(null, null);

		mockMvc.perform(get("/api/demandes-territoire/{id}/territoires-disponibles", onlyRequest().getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(3));
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void manager_ClosesRequestWithoutAssignment() throws Exception {
		createRequest(brest.getId(), null);
		UUID requestId = onlyRequest().getId();

		mockMvc.perform(post("/api/demandes-territoire/{id}/cloture", requestId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CLOTUREE"))
				.andExpect(jsonPath("$.closedAt").exists());
		mockMvc.perform(post("/api/demandes-territoire/{id}/cloture", requestId))
				.andExpect(status().isConflict());

		// La personne peut refaire une demande
		mockMvc.perform(get("/api/public/acces/{token}", token)).andExpect(jsonPath("$.pendingRequest").isEmpty());
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void utilisateur_HasNoAccessToRequests() throws Exception {
		mockMvc.perform(get("/api/demandes-territoire")).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/demandes-territoire/en-attente/nombre")).andExpect(status().isForbidden());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void settings_TerritoryRequestPhone() throws Exception {
		mockMvc.perform(put("/api/settings/acces-numerique")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"territoryRequestPhone\":\"06 12\"}"))
				.andExpect(status().isBadRequest());
		mockMvc.perform(put("/api/settings/acces-numerique")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"territoryRequestPhone\":\"" + MANAGER_PHONE + "\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.territoryRequestPhone").value(MANAGER_PHONE));
		mockMvc.perform(put("/api/settings/acces-numerique")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"territoryRequestPhone\":\"\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.territoryRequestPhone").isEmpty());
	}

	@Test
	void deletingTerritoryOrPerson_KeepsDatabaseConsistent() throws Exception {
		createRequest(rennes.getId(), null);
		TerritoryRequest request = onlyRequest();
		request.setStatus(TerritoryRequestStatus.ATTRIBUEE);
		request.setTerritory(neverVisited);
		requestRepository.save(request);

		// La demande reste dans l'historique, sans le territoire supprimé
		territoryRepository.delete(neverVisited);
		assertNull(requestRepository.findById(request.getId()).orElseThrow().getTerritory());

		// Une personne sans historique d'attribution peut être supprimée avec ses demandes
		personAccessRepository.deleteAll();
		personService.deletePerson(person.getId());
		assertEquals(0, requestRepository.count());
	}
}
