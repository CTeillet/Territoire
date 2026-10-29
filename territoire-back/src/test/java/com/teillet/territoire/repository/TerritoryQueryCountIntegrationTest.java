package com.teillet.territoire.repository;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Les listes de territoires (carte générale, tableau) ne font pas une requête SQL par territoire ou par personne :
 * leur nombre de requêtes ne dépend pas du nombre de territoires.
 * Même configuration que TerritoryControllerIntegrationTest, pour réutiliser son contexte Spring.
 */
@SpringBootTest
@AutoConfigureMockMvc
class TerritoryQueryCountIntegrationTest {
	private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

	@Autowired private MockMvc mockMvc;
	@Autowired private EntityManagerFactory entityManagerFactory;
	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private CityRepository cityRepository;
	@Autowired private PersonRepository personRepository;
	@Autowired private AssignmentRepository assignmentRepository;
	@Autowired private AddressNotToDoRepository addressNotToDoRepository;
	@Autowired private TerritoryReminderRepository territoryReminderRepository;

	private City city;

	/** Base H2 partagée entre les classes de test : nettoyée avant et après chaque test. */
	@AfterEach
	void cleanUp() {
		territoryReminderRepository.deleteAll();
		addressNotToDoRepository.deleteAll();
		assignmentRepository.deleteAll();
		territoryRepository.deleteAll();
		personRepository.deleteAll();
		cityRepository.deleteAll();
	}

	@BeforeEach
	void setUp() {
		cleanUp();
		city = cityRepository.save(City.builder()
				.name("Rennes")
				.zipCode("35000")
				.center(geometryFactory.createPoint(new Coordinate(-1.6777, 48.1173)))
				.build());
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void geoJsonQueryCountDoesNotGrowWithTerritories() throws Exception {
		assertQueryCountIndependentOfTerritoryCount("/api/territoires/geojson");
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void territoryListQueryCountDoesNotGrowWithTerritories() throws Exception {
		assertQueryCountIndependentOfTerritoryCount("/api/territoires");
	}

	private void assertQueryCountIndependentOfTerritoryCount(String url) throws Exception {
		createTerritoriesWithAssignments(2);
		long withTwoTerritories = countStatements(url);
		createTerritoriesWithAssignments(10);
		long withTwelveTerritories = countStatements(url);

		assertEquals(withTwoTerritories, withTwelveTerritories,
				"Requêtes SQL pour " + url + " : " + withTwoTerritories + " avec 2 territoires, " + withTwelveTerritories + " avec 12");
	}

	private long countStatements(String url) throws Exception {
		Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
		statistics.setStatisticsEnabled(true);
		statistics.clear();
		try {
			mockMvc.perform(get(url)).andExpect(status().isOk());
			return statistics.getPrepareStatementCount();
		} finally {
			statistics.setStatisticsEnabled(false);
		}
	}

	/** Chaque territoire a été attribué deux fois, à deux personnes différentes (dont une attribution en cours). */
	private void createTerritoriesWithAssignments(int count) {
		for (int i = 0; i < count; i++) {
			Territory territory = new Territory();
			territory.setName("Territoire " + i);
			territory.setCity(city);
			territory.setStatus(TerritoryStatus.ASSIGNED);
			territory.setType(TerritoryType.HOUSE);
			territory.setLastModifiedDate(LocalDate.now());
			territory.setConcaveHull(geometryFactory.createMultiPolygon(new Polygon[]{square(-1.6 + i * 0.01, 48.1)}));
			territory = territoryRepository.save(territory);

			Person previous = personRepository.save(Person.builder().firstName("Ancien").lastName("Porteur " + i).build());
			Person current = personRepository.save(Person.builder().firstName("Porteur").lastName("Actuel " + i).build());
			LocalDate start = LocalDate.now().minusMonths(6);
			assignmentRepository.save(Assignment.builder().territory(territory).person(previous)
					.assignmentDate(start).dueDate(start.plusMonths(4)).returnDate(start.plusMonths(2)).build());
			assignmentRepository.save(Assignment.builder().territory(territory).person(current)
					.assignmentDate(LocalDate.now().minusDays(10)).dueDate(LocalDate.now().plusMonths(4)).build());
		}
	}

	private Polygon square(double x, double y) {
		return geometryFactory.createPolygon(new Coordinate[]{
				new Coordinate(x, y),
				new Coordinate(x + 0.005, y),
				new Coordinate(x + 0.005, y + 0.005),
				new Coordinate(x, y + 0.005),
				new Coordinate(x, y)
		});
	}
}
