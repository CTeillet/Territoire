package com.teillet.territoire.controller;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.PersonAccess;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.PersonAccessRepository;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.security.AccessLinkTokens;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Journal des actions : qui a fait quoi, et quand ; un nom anonymisé disparaît aussi du journal. */
@SpringBootTest
@AutoConfigureMockMvc
class AuditIntegrationTest {
	@Autowired private MockMvc mockMvc;
	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private CityRepository cityRepository;
	@Autowired private PersonRepository personRepository;
	@Autowired private PersonAccessRepository personAccessRepository;
	@Autowired private AccessLinkTokens tokens;
	@Autowired private JdbcTemplate jdbcTemplate;

	// Message d'attribution par WhatsApp : sans objet ici
	@MockitoBean
	private IWahaClient wahaClient;

	private Territory territory;
	private Person jean;

	@BeforeEach
	void setUp() {
		cleanUp();
		City c = new City();
		c.setName("Rennes");
		c.setZipCode("35000");
		c.setCenter(new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-1.6777, 48.1173)));
		City city = cityRepository.save(c);
		Territory t = new Territory();
		t.setName("T-Journal");
		t.setCity(city);
		t.setStatus(TerritoryStatus.AVAILABLE);
		t.setType(TerritoryType.HOUSE);
		t.setLastModifiedDate(LocalDate.now());
		territory = territoryRepository.save(t);
		jean = personRepository.save(Person.builder().firstName("Jean").lastName("Dupont").phoneNumber("+33612345678").build());
	}

	/** Base partagée entre les classes de test : rien ne doit rester. */
	@AfterEach
	void cleanUp() {
		jdbcTemplate.update("DELETE FROM audit_event");
		personAccessRepository.deleteAll();
		jdbcTemplate.update("DELETE FROM assignment");
		jdbcTemplate.update("DELETE FROM territory");
		personRepository.deleteAll();
		cityRepository.deleteAll();
	}

	@Test
	void assignmentsAndReturnsAreLoggedWithTheirAuthor() throws Exception {
		mockMvc.perform(post("/api/territoires/{t}/attribuer/{p}", territory.getId(), jean.getId())
						.with(user("gestion@exemple.fr").roles("GESTIONNAIRE")))
				.andExpect(status().isOk());
		mockMvc.perform(post("/api/territoires/{t}/retour", territory.getId())
						.with(user("super@exemple.fr").roles("SUPERVISEUR")))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/journal").param("territoryId", territory.getId().toString())
						.with(user("admin@exemple.fr").roles("ADMIN")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				// Le plus récent d'abord
				.andExpect(jsonPath("$[0].action").value("RETOUR"))
				.andExpect(jsonPath("$[0].actor").value("super@exemple.fr"))
				.andExpect(jsonPath("$[1].action").value("ATTRIBUTION"))
				.andExpect(jsonPath("$[1].actor").value("gestion@exemple.fr"))
				.andExpect(jsonPath("$[1].territoryName").value("T-Journal"))
				.andExpect(jsonPath("$[1].personName").value("Jean Dupont"))
				.andExpect(jsonPath("$[1].occurredAt").exists());
	}

	@Test
	void aReturnFromThePersonalLinkIsLogged() throws Exception {
		mockMvc.perform(post("/api/territoires/{t}/attribuer/{p}", territory.getId(), jean.getId())
				.with(user("gestion@exemple.fr").roles("GESTIONNAIRE"))).andExpect(status().isOk());
		personAccessRepository.save(PersonAccess.builder().person(jean).version(3).createdAt(Instant.now()).build());

		mockMvc.perform(post("/api/public/acces/{token}/territoires/{t}/retour", tokens.generate(jean.getId(), 3), territory.getId()))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/journal").with(user("admin@exemple.fr").roles("ADMIN")))
				.andExpect(jsonPath("$[0].action").value("RETOUR_PAR_LIEN"))
				.andExpect(jsonPath("$[0].actor").value("Lien personnel"))
				.andExpect(jsonPath("$[0].territoryName").value("T-Journal"));
	}

	@Test
	void anAnonymizedNameDisappearsFromTheLog() throws Exception {
		mockMvc.perform(post("/api/territoires/{t}/attribuer/{p}", territory.getId(), jean.getId())
				.with(user("gestion@exemple.fr").roles("GESTIONNAIRE"))).andExpect(status().isOk());
		mockMvc.perform(post("/api/territoires/{t}/retour", territory.getId())
				.with(user("gestion@exemple.fr").roles("GESTIONNAIRE"))).andExpect(status().isOk());
		mockMvc.perform(post("/api/personnes/{p}/archiver", jean.getId())
				.with(user("admin@exemple.fr").roles("ADMIN"))).andExpect(status().isOk());
		mockMvc.perform(post("/api/personnes/{p}/anonymiser", jean.getId())
				.with(user("admin@exemple.fr").roles("ADMIN"))).andExpect(status().isOk());

		mockMvc.perform(get("/api/journal").param("personId", jean.getId().toString())
						.with(user("admin@exemple.fr").roles("ADMIN")))
				.andExpect(jsonPath("$[0].action").value("PERSONNE_ANONYMISEE"))
				.andExpect(jsonPath("$[*].personName", not(hasItem("Jean Dupont"))))
				.andExpect(jsonPath("$[*].action", hasItem("PERSONNE_ARCHIVEE")));
	}

	@Test
	void theLogIsReservedToAdminsAndSupervisors() throws Exception {
		mockMvc.perform(get("/api/journal").with(user("gestion@exemple.fr").roles("GESTIONNAIRE")))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/journal").with(user("super@exemple.fr").roles("SUPERVISEUR")))
				.andExpect(status().isOk());
	}
}
