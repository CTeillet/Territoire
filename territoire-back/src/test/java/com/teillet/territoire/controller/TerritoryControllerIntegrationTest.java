package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.AddAddressNotToDoDto;
import com.teillet.territoire.dto.AddTerritoryDto;
import com.teillet.territoire.dto.UpdateTerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.AddressNotToDo;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AddressNotToDoRepository;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TerritoryControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TerritoryRepository territoryRepository;

	@Autowired
	private CityRepository cityRepository;

	@Autowired
	private PersonRepository personRepository;

	@Autowired
	private AssignmentRepository assignmentRepository;

	@Autowired
	private AddressNotToDoRepository addressNotToDoRepository;

	@Autowired
	private ObjectMapper objectMapper;

	private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
	private City city;

	private Territory createTestTerritory(String name, TerritoryType type, TerritoryStatus status) {
		Territory t = new Territory();
		t.setName(name);
		t.setCity(city);
		t.setStatus(status);
		t.setType(type);
		t.setLastModifiedDate(LocalDate.now());
		return t;
	}

	@BeforeEach
	void setUp() {
		addressNotToDoRepository.deleteAll();
		assignmentRepository.deleteAll();
		territoryRepository.deleteAll();
		personRepository.deleteAll();
		cityRepository.deleteAll();

		City c = new City();
		c.setName("Rennes");
		c.setZipCode("35000");
		c.setCenter(geometryFactory.createPoint(new Coordinate(-1.6777, 48.1173)));
		city = cityRepository.save(c);
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetTerritories() throws Exception {
		territoryRepository.save(createTestTerritory("Territoire 1", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));

		mockMvc.perform(get("/api/territoires"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("Territoire 1"));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetTerritoryById() throws Exception {
		Territory saved = territoryRepository.save(createTestTerritory("Territoire Unique", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));

		mockMvc.perform(get("/api/territoires/{id}", saved.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Territoire Unique"));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetTerritoriesGeoJson() throws Exception {
		territoryRepository.save(createTestTerritory("Territoire GeoJson", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));

		mockMvc.perform(get("/api/territoires/geojson"))
				.andExpect(status().isOk());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testCreateTerritory() throws Exception {
		AddTerritoryDto dto = new AddTerritoryDto();
		dto.setName("Territoire 2");
		dto.setCityId(city.getId());
		dto.setType(TerritoryType.BUILDING);

		mockMvc.perform(post("/api/territoires")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Territoire 2"));
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void testModifyTerritory() throws Exception {
		Territory saved = territoryRepository.save(createTestTerritory("Initial Name", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));

		UpdateTerritoryDto dto = new UpdateTerritoryDto();
		dto.setName("Updated Name");
		dto.setType(TerritoryType.BUILDING);
		dto.setCityId(city.getId());

		mockMvc.perform(put("/api/territoires/{id}", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Updated Name"));

		Territory updated = territoryRepository.findById(saved.getId()).orElseThrow();
		assertEquals("Updated Name", updated.getName());
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void testAssignAndReturnTerritory() throws Exception {
		Territory savedTerritory = territoryRepository.save(createTestTerritory("Territoire 3", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));

		Person person = personRepository.save(Person.builder()
				.firstName("Jean")
				.lastName("Valjean")
				.build());

		// Assign
		mockMvc.perform(post("/api/territoires/{id}/attribuer/{personId}", savedTerritory.getId(), person.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.territory.territoryId").value(savedTerritory.getId().toString()));

		Territory assigned = territoryRepository.findById(savedTerritory.getId()).orElseThrow();
		assertEquals(TerritoryStatus.ASSIGNED, assigned.getStatus());

		// Return
		mockMvc.perform(post("/api/territoires/{id}/retour", savedTerritory.getId()))
				.andExpect(status().isOk());

		Territory returned = territoryRepository.findById(savedTerritory.getId()).orElseThrow();
		assertEquals(TerritoryStatus.PENDING, returned.getStatus());
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void testCancelAssignment() throws Exception {
		Territory savedTerritory = territoryRepository.save(createTestTerritory("Territoire Cancel", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));
		Person person = personRepository.save(Person.builder().firstName("Paul").lastName("Dupond").build());

		mockMvc.perform(post("/api/territoires/{id}/attribuer/{personId}", savedTerritory.getId(), person.getId()))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/territoires/{id}/annuler-assignation", savedTerritory.getId()))
				.andExpect(status().isOk());

		Territory afterCancel = territoryRepository.findById(savedTerritory.getId()).orElseThrow();
		assertEquals(TerritoryStatus.AVAILABLE, afterCancel.getStatus());
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void testExtendTerritoryAndModifyDate() throws Exception {
		Territory savedTerritory = territoryRepository.save(createTestTerritory("Territoire Prolong", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));
		Person person = personRepository.save(Person.builder().firstName("Claire").lastName("Durand").build());

		mockMvc.perform(post("/api/territoires/{id}/attribuer/{personId}", savedTerritory.getId(), person.getId()))
				.andExpect(status().isOk());

		// Prolongation sans date explicite
		mockMvc.perform(post("/api/territoires/{id}/prolongation", savedTerritory.getId()))
				.andExpect(status().isOk());

		// Prolongation avec date explicite
		mockMvc.perform(post("/api/territoires/{id}/prolongation", savedTerritory.getId())
						.param("dueDate", LocalDate.now().plusMonths(6).toString()))
				.andExpect(status().isOk());

		// Modifier date d'attribution
		mockMvc.perform(post("/api/territoires/{id}/modifier-date-attribution", savedTerritory.getId())
						.param("assignmentDate", LocalDate.now().minusDays(10).toString()))
				.andExpect(status().isOk());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testAddressNotToDoOperations() throws Exception {
		Territory savedTerritory = territoryRepository.save(createTestTerritory("Territoire Adr", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));

		AddAddressNotToDoDto dto = new AddAddressNotToDoDto();
		dto.setStreet("Rue de la Paix");
		dto.setNumber("10");
		dto.setCity("Rennes");
		dto.setZipCode("35000");

		// Création
		String response = mockMvc.perform(post("/api/territoires/{id}/adresses-a-ne-pas-visiter", savedTerritory.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.street").value("Rue de la Paix"))
				.andReturn().getResponse().getContentAsString();

		AddressNotToDo created = objectMapper.readValue(response, AddressNotToDo.class);

		// Modification
		dto.setStreet("Rue modifiee");
		mockMvc.perform(put("/api/territoires/{id}/adresses-a-ne-pas-visiter/{addressId}", savedTerritory.getId(), created.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.street").value("Rue modifiee"));

		// Suppression
		mockMvc.perform(delete("/api/territoires/{id}/adresses-a-ne-pas-visiter/{addressId}", savedTerritory.getId(), created.getId()))
				.andExpect(status().isOk());

		assertFalse(addressNotToDoRepository.findById(created.getId()).isPresent());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testCheckAvailableTerritories() throws Exception {
		mockMvc.perform(put("/api/territoires/verification-disponible"))
				.andExpect(status().isOk());
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testStatisticsEndpoints() throws Exception {
		mockMvc.perform(get("/api/territoires/statistiques/non-assignes-depuis"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/territoires/statistiques/duree-moyenne-attribution/par-mois"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/territoires/statistiques/duree-moyenne-attribution/globale"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/territoires/statistiques/distribution-par-ville"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/territoires/statistiques/resume-periode"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/territoires/statistiques/carte-couverture"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/territoires/statistiques/periodes"))
				.andExpect(status().isOk());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testUploadAndGetTerritoryMap() throws Exception {
		Territory saved = territoryRepository.save(createTestTerritory("Territoire Map", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));

		MockMultipartFile file = new MockMultipartFile("file", "test-map.png", "image/png", "fake-image-bytes".getBytes());

		// Upload map
		mockMvc.perform(multipart("/api/territoires/{id}/carte", saved.getId()).file(file))
				.andExpect(status().isOk())
				.andExpect(content().string("Carte du territoire téléchargée avec succès"));

		// Get map
		byte[] responseBytes = mockMvc.perform(get("/api/territoires/{id}/carte", saved.getId()))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG))
				.andReturn().getResponse().getContentAsByteArray();

		assertNotNull(responseBytes);
		assertTrue(responseBytes.length >= "fake-image-bytes".getBytes().length);
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetTerritoryMap_NotFoundWhenNoMap() throws Exception {
		Territory saved = territoryRepository.save(createTestTerritory("No Map Terr", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));

		mockMvc.perform(get("/api/territoires/{id}/carte", saved.getId()))
				.andExpect(status().isNotFound());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testDeleteTerritory() throws Exception {
		Territory saved = territoryRepository.save(createTestTerritory("To Delete", TerritoryType.HOUSE, TerritoryStatus.AVAILABLE));

		mockMvc.perform(delete("/api/territoires/{id}", saved.getId()))
				.andExpect(status().isOk());

		assertFalse(territoryRepository.findById(saved.getId()).isPresent());
	}
}
