package com.teillet.territoire.repository;

import com.teillet.territoire.enums.Role;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Block;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.model.User;
import com.teillet.territoire.repository.projection.Bbox3857;
import com.teillet.territoire.repository.projection.TerritoryHullRow;
import com.teillet.territoire.service.ITerritoryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.geom.PrecisionModel;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKBReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Requêtes natives PostgreSQL/PostGIS (ST_Transform, ST_Buffer, ST_Extent, EXTRACT(EPOCH ...)) : H2 ne sait pas les exécuter,
 * elles sont testées ici sur l'image PostGIS de production, dans un conteneur Docker. Ignoré sans Docker ; la CI en a un.
 */
@SpringBootTest(properties = {
		"spring.datasource.driver-class-name=org.postgresql.Driver",
		"spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
		// Comme en production (src/main/resources/application.properties) : tables qualifiées (public.user fonctionne, user seul non)
		"spring.jpa.properties.hibernate.default_schema=public"
})
@Testcontainers(disabledWithoutDocker = true)
class PostgisIntegrationTest {
	/** Même image que la production (docker-compose.yml). */
	@Container
	@ServiceConnection
	static final PostgreSQLContainer POSTGIS = new PostgreSQLContainer(
			DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres"));

	private static final double RENNES_LON = -1.6777;
	private static final double RENNES_LAT = 48.1173;
	/** Environ 37 m d'est en ouest et 28 m du nord au sud à cette latitude. */
	private static final double SIDE = 0.0005;

	private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private BlockRepository blockRepository;
	@Autowired private CityRepository cityRepository;
	@Autowired private PersonRepository personRepository;
	@Autowired private AssignmentRepository assignmentRepository;
	@Autowired private ITerritoryService territoryService;
	@Autowired private UserRepository userRepository;

	private City rennes;

	@AfterEach
	void cleanUp() {
		assignmentRepository.deleteAll();
		blockRepository.deleteAll();
		territoryRepository.deleteAll();
		personRepository.deleteAll();
		cityRepository.deleteAll();
	}

	@BeforeEach
	void setUp() {
		cleanUp();
		rennes = city("Rennes", "#ff0000");
	}

	/**
	 * « user » est un mot réservé de PostgreSQL : la table des comptes ne fonctionne que parce que Hibernate qualifie
	 * les tables par le schéma (hibernate.default_schema=public). Sans ce réglage, la connexion par e-mail échoue.
	 */
	@Test
	void usersCanBeStoredAndFoundByEmail() {
		User user = new User();
		user.setEmail("admin@example.com");
		user.setUsername("admin");
		user.setPassword("hash");
		user.setRole(Role.ADMIN);
		userRepository.save(user);

		assertEquals("admin", userRepository.findByEmail("admin@example.com").orElseThrow().getUsername());
		userRepository.deleteAll();
	}

	@Test
	void concaveHullIsComputedFromBlocks() {
		Territory territory = territory("Deux blocs", rennes, null);
		Polygon west = square(RENNES_LON, RENNES_LAT);
		Polygon east = square(RENNES_LON + SIDE, RENNES_LAT);
		blockRepository.save(Block.builder().block(west).territory(territory).build());
		blockRepository.save(Block.builder().block(east).territory(territory).build());

		territoryService.updateConcaveHull(territory.getId());

		MultiPolygon hull = territoryRepository.findById(territory.getId()).orElseThrow().getConcaveHull();
		assertNotNull(hull, "Le contour doit être calculé à partir des blocs");
		assertEquals(4326, hull.getSRID());
		assertTrue(hull.contains(west.getCentroid()) && hull.contains(east.getCentroid()), "Le contour doit couvrir les deux blocs");
		// Union des blocs élargie de 7 m puis rétrécie de 8 m : un peu plus petite que les deux blocs réunis
		double blocksArea = west.union(east).getArea();
		assertTrue(hull.getArea() < blocksArea && hull.getArea() > blocksArea * 0.8,
				"Surface du contour " + hull.getArea() + " pour des blocs de " + blocksArea);
	}

	@Test
	void hullsAreProjectedToWebMercator() throws ParseException {
		territory("Rennes centre", rennes, multiPolygon(square(RENNES_LON, RENNES_LAT)));
		territory("Ailleurs", city("Autre ville", "#00ff00"), multiPolygon(square(RENNES_LON + 1, RENNES_LAT)));

		List<TerritoryHullRow> rows = territoryRepository.findAllProjected3857ByCityId(rennes.getId());

		assertEquals(1, rows.size());
		TerritoryHullRow row = rows.getFirst();
		assertEquals("Rennes centre", row.getName());
		assertEquals("#ff0000", row.getCityColorHex());
		Geometry hull = new WKBReader().read(row.getHullWkb());
		Geometry label = new WKBReader().read(row.getLabelWkb());
		assertEquals(webMercatorX(RENNES_LON), hull.getEnvelopeInternal().getMinX(), 1.0);
		assertEquals(webMercatorY(RENNES_LAT), hull.getEnvelopeInternal().getMinY(), 1.0);
		assertTrue(hull.contains(label), "L'étiquette doit être placée dans le territoire");
		assertEquals(2, territoryRepository.findAllProjected3857().size());
	}

	@Test
	void boundingBoxIsComputedInWebMercator() {
		territory("Ouest", rennes, multiPolygon(square(RENNES_LON, RENNES_LAT)));
		territory("Est", rennes, multiPolygon(square(RENNES_LON + 0.01, RENNES_LAT + 0.01)));
		territory("Ailleurs", city("Autre ville", "#00ff00"), multiPolygon(square(RENNES_LON + 1, RENNES_LAT)));

		Bbox3857 bbox = territoryRepository.findBbox3857ByCityId(rennes.getId());

		assertEquals(webMercatorX(RENNES_LON), bbox.getMinx(), 1.0);
		assertEquals(webMercatorY(RENNES_LAT), bbox.getMiny(), 1.0);
		assertEquals(webMercatorX(RENNES_LON + 0.01 + SIDE), bbox.getMaxx(), 1.0);
		assertEquals(webMercatorY(RENNES_LAT + 0.01 + SIDE), bbox.getMaxy(), 1.0);
		assertEquals(webMercatorX(RENNES_LON + 1 + SIDE), territoryRepository.findBbox3857().getMaxx(), 1.0);
	}

	@Test
	void averageAssignmentDurationIsComputedInDays() {
		Territory territory = territory("Territoire", rennes, null);
		Person person = personRepository.save(Person.builder().firstName("Alice").lastName("Martin").build());
		LocalDate start = LocalDate.of(2026, 1, 5);
		assignment(territory, person, start, start.plusDays(10));
		assignment(territory, person, start.plusMonths(2), start.plusMonths(2).plusDays(20));
		// Attribution en cours : ignorée
		assignment(territory, person, start.plusMonths(4), null);

		assertEquals(15.0, assignmentRepository.calculateOverallAverageAssignmentDuration(), 0.001);
		assertEquals(10.0, assignmentRepository.calculateOverallAverageAssignmentDurationBetween(start, start.plusMonths(1)), 0.001);
		assertEquals(20.0, assignmentRepository.calculateOverallAverageAssignmentDurationBetween(start.plusMonths(1), null), 0.001);
	}

	@Test
	void territoriesAreDistributedByCity() {
		City other = city("Autre ville", "#00ff00");
		Territory assigned = territory("Rennes 1", rennes, null);
		territory("Rennes 2", rennes, null);
		territory("Autre 1", other, null);
		Person person = personRepository.save(Person.builder().firstName("Alice").lastName("Martin").build());
		assignment(assigned, person, LocalDate.of(2026, 3, 1), null);

		List<Object[]> all = territoryRepository.calculateTerritoryDistributionByCity(null, null);
		assertEquals(2, all.size());
		assertEquals("Rennes", all.getFirst()[0]);
		assertEquals(2L, ((Number) all.getFirst()[1]).longValue());
		assertEquals(66.67, ((Number) all.getFirst()[2]).doubleValue(), 0.01);

		List<Object[]> assignedSince = territoryRepository.calculateTerritoryDistributionByCity(LocalDate.of(2026, 1, 1), null);
		assertEquals(1, assignedSince.size());
		assertEquals("Rennes", assignedSince.getFirst()[0]);
		assertEquals(1L, ((Number) assignedSince.getFirst()[1]).longValue());
	}

	private City city(String name, String colorHex) {
		return cityRepository.save(City.builder()
				.name(name)
				.zipCode("35000")
				.colorHex(colorHex)
				.center(geometryFactory.createPoint(new Coordinate(RENNES_LON, RENNES_LAT)))
				.build());
	}

	private Territory territory(String name, City city, MultiPolygon hull) {
		Territory territory = new Territory();
		territory.setName(name);
		territory.setCity(city);
		territory.setStatus(TerritoryStatus.AVAILABLE);
		territory.setType(TerritoryType.HOUSE);
		territory.setLastModifiedDate(LocalDate.now());
		territory.setConcaveHull(hull);
		return territoryRepository.save(territory);
	}

	private void assignment(Territory territory, Person person, LocalDate assignedOn, LocalDate returnedOn) {
		assignmentRepository.save(Assignment.builder().territory(territory).person(person)
				.assignmentDate(assignedOn).dueDate(assignedOn.plusMonths(4)).returnDate(returnedOn).build());
	}

	/** Carré dont le coin sud-ouest est (lon, lat). */
	private Polygon square(double lon, double lat) {
		return geometryFactory.createPolygon(new Coordinate[]{
				new Coordinate(lon, lat),
				new Coordinate(lon + SIDE, lat),
				new Coordinate(lon + SIDE, lat + SIDE),
				new Coordinate(lon, lat + SIDE),
				new Coordinate(lon, lat)
		});
	}

	private MultiPolygon multiPolygon(Polygon polygon) {
		return geometryFactory.createMultiPolygon(new Polygon[]{polygon});
	}

	private static double webMercatorX(double lon) {
		return lon * 20037508.342789244 / 180;
	}

	private static double webMercatorY(double lat) {
		return Math.log(Math.tan((90 + lat) * Math.PI / 360)) * 6378137;
	}
}
