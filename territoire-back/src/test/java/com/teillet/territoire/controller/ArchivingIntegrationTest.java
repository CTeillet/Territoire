package com.teillet.territoire.controller;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.PersonAccess;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.PersonAccessRepository;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Archivage plutôt que suppression : l'historique d'un territoire ou d'une personne n'est jamais perdu, et un territoire
 * archivé disparaît des listes sans casser l'historique de ceux qui l'ont parcouru.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ArchivingIntegrationTest {
	@Autowired private MockMvc mockMvc;
	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private CityRepository cityRepository;
	@Autowired private PersonRepository personRepository;
	@Autowired private PersonAccessRepository personAccessRepository;
	@Autowired private AssignmentRepository assignmentRepository;
	@Autowired private JdbcTemplate jdbcTemplate;

	private City city;
	private Person jean;

	@BeforeEach
	void setUp() {
		cleanUp();
		City c = new City();
		c.setName("Rennes");
		c.setZipCode("35000");
		c.setCenter(new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-1.6777, 48.1173)));
		city = cityRepository.save(c);
		jean = personRepository.save(Person.builder().firstName("Jean").lastName("Dupont").phoneNumber("+33612345678").build());
	}

	/** Base partagée entre les classes de test : les territoires archivés (cachés aux requêtes JPA) aussi. */
	@AfterEach
	void cleanUp() {
		personAccessRepository.deleteAll();
		jdbcTemplate.update("DELETE FROM assignment");
		jdbcTemplate.update("DELETE FROM territory");
		personRepository.deleteAll();
		cityRepository.deleteAll();
	}

	private Territory territory(String name, TerritoryStatus status) {
		Territory t = new Territory();
		t.setName(name);
		t.setCity(city);
		t.setStatus(status);
		t.setType(TerritoryType.HOUSE);
		t.setLastModifiedDate(LocalDate.now());
		return territoryRepository.save(t);
	}

	private void returnedAssignment(Territory territory) {
		assignmentRepository.save(Assignment.builder()
				.territory(territory)
				.person(jean)
				.assignmentDate(LocalDate.now().minusMonths(3))
				.dueDate(LocalDate.now().plusMonths(1))
				.returnDate(LocalDate.now().minusDays(2))
				.build());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void aTerritoryWithHistoryIsArchivedNotDeleted() throws Exception {
		Territory t = territory("T-Hist", TerritoryStatus.PENDING);
		returnedAssignment(t);

		mockMvc.perform(delete("/api/territoires/{id}", t.getId()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error").value("Ce territoire a un historique d'attributions : archivez-le plutôt que de le supprimer"));

		mockMvc.perform(post("/api/territoires/{id}/archiver", t.getId())).andExpect(status().isNoContent());

		// Absent des listes et de la carte...
		mockMvc.perform(get("/api/territoires"))
				.andExpect(jsonPath("$[*].name", not(hasItem("T-Hist"))));
		mockMvc.perform(get("/api/territoires/geojson"))
				.andExpect(jsonPath("$.features[*].properties.name", not(hasItem("T-Hist"))));
		// ...mais listé dans les archives, avec son historique
		mockMvc.perform(get("/api/territoires/archives"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("T-Hist"))
				.andExpect(jsonPath("$[0].cityName").value("Rennes"))
				.andExpect(jsonPath("$[0].assignments").value(1));
		// L'historique de la personne garde ce territoire
		mockMvc.perform(get("/api/personnes/{id}/territoires", jean.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1));
		assertThat(assignmentRepository.count()).isEqualTo(1);

		mockMvc.perform(post("/api/territoires/{id}/restaurer", t.getId())).andExpect(status().isNoContent());
		mockMvc.perform(get("/api/territoires/archives")).andExpect(jsonPath("$.length()").value(0));
		mockMvc.perform(get("/api/territoires")).andExpect(jsonPath("$[*].name", hasItem("T-Hist")));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void anAssignedTerritoryCannotBeArchivedAndANewOneCanStillBeDeleted() throws Exception {
		Territory assigned = territory("T-Attribue", TerritoryStatus.ASSIGNED);
		mockMvc.perform(post("/api/territoires/{id}/archiver", assigned.getId()))
				.andExpect(status().isConflict());

		Territory mistake = territory("T-Erreur", TerritoryStatus.AVAILABLE);
		mockMvc.perform(delete("/api/territoires/{id}", mistake.getId())).andExpect(status().isOk());
		assertThat(territoryRepository.findById(mistake.getId())).isEmpty();
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void aCityWithOnlyArchivedTerritoriesIsNotDeleted() throws Exception {
		Territory t = territory("T-Ville", TerritoryStatus.AVAILABLE);
		returnedAssignment(t);
		mockMvc.perform(post("/api/territoires/{id}/archiver", t.getId())).andExpect(status().isNoContent());

		mockMvc.perform(delete("/api/villes/{id}", city.getId()));
		assertThat(cityRepository.findById(city.getId())).isPresent();
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void aPersonWhoLeftIsArchivedThenAnonymized() throws Exception {
		Territory running = territory("T-Cours", TerritoryStatus.ASSIGNED);
		Assignment current = assignmentRepository.save(Assignment.builder()
				.territory(running).person(jean)
				.assignmentDate(LocalDate.now()).dueDate(LocalDate.now().plusMonths(4)).build());
		mockMvc.perform(post("/api/personnes/{id}/archiver", jean.getId()))
				.andExpect(status().isConflict());
		current.setReturnDate(LocalDate.now());
		assignmentRepository.save(current);
		personAccessRepository.save(PersonAccess.builder().person(jean).version(1).createdAt(Instant.now()).build());

		mockMvc.perform(post("/api/personnes/{id}/anonymiser", jean.getId()))
				.andExpect(status().isConflict());
		mockMvc.perform(post("/api/personnes/{id}/archiver", jean.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.archivedAt").exists());
		assertThat(personAccessRepository.findByPerson_Id(jean.getId()).orElseThrow().isRevoked()).isTrue();
		mockMvc.perform(get("/api/personnes")).andExpect(jsonPath("$[*].lastName", not(hasItem("Dupont"))));
		mockMvc.perform(get("/api/personnes/archives")).andExpect(jsonPath("$[0].lastName").value("Dupont"));

		mockMvc.perform(post("/api/personnes/{id}/anonymiser", jean.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.firstName").value("Personne"))
				.andExpect(jsonPath("$.lastName").value("anonymisée " + jean.getId().toString().substring(0, 4)))
				.andExpect(jsonPath("$.phoneNumber").doesNotExist())
				.andExpect(jsonPath("$.anonymizedAt").exists());
		assertThat(personAccessRepository.findByPerson_Id(jean.getId())).isEmpty();
		// Son historique reste compté
		assertThat(assignmentRepository.findByPerson_Id(jean.getId())).hasSize(1);
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void onlyAnAdminAnonymizesAndArchivedPersonsCanBeRestored() throws Exception {
		mockMvc.perform(post("/api/personnes/{id}/archiver", jean.getId())).andExpect(status().isOk());
		mockMvc.perform(post("/api/personnes/{id}/anonymiser", jean.getId())).andExpect(status().isForbidden());

		mockMvc.perform(post("/api/personnes/{id}/restaurer", jean.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.archivedAt").doesNotExist());
		mockMvc.perform(get("/api/personnes")).andExpect(jsonPath("$[*].lastName", hasItem("Dupont")));
	}
}
