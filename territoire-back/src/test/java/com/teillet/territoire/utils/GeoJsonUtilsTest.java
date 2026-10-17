package com.teillet.territoire.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Block;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LinearRing;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.geom.PrecisionModel;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Vérifie le contenu du GeoJSON affiché par les cartes du front.
 * Protège notamment les montées de version de GeoTools (FeatureJSON / GeometryJSON).
 */
class GeoJsonUtilsTest {

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
	private final City city = City.builder().name("Rennes").zipCode("35000").build();

	// ---------- convertToGeoJSON(territoires) ----------

	@Test
	void convertToGeoJSON_territories_encodesGeometryAndProperties() throws Exception {
		Territory territory = territory("Territoire 1", TerritoryStatus.ASSIGNED, TerritoryType.HOUSE, square(-1.123456789, 48.123456789));
		Person person = Person.builder().id(UUID.randomUUID()).firstName("jean").lastName("DUPONT").build();
		territory.getAssignments().add(Assignment.builder()
				.id(UUID.randomUUID())
				.person(person)
				.territory(territory)
				.assignmentDate(LocalDate.of(2026, 1, 2))
				.dueDate(LocalDate.of(2026, 3, 4))
				.build());

		JsonNode root = parse(GeoJsonUtils.convertToGeoJSON(List.of(territory)));

		assertEquals("FeatureCollection", root.path("type").asText());
		assertEquals(1, root.path("features").size());

		JsonNode feature = root.path("features").get(0);
		assertEquals("Feature", feature.path("type").asText());
		assertMultiPolygonSquare(feature.path("geometry"));

		JsonNode properties = feature.path("properties");
		assertEquals(Set.of("id", "name", "status", "city", "lastVisitedOn", "assignedTo", "assignedOn", "waitedFor", "type", "assignments"),
				propertyNames(properties));
		assertEquals(territory.getId().toString(), properties.path("id").asText());
		assertEquals("Territoire 1", properties.path("name").asText());
		assertEquals("ASSIGNED", properties.path("status").asText());
		assertEquals("Rennes", properties.path("city").asText());
		assertEquals("HOUSE", properties.path("type").asText());
		assertEquals(TerritoryUtils.NOUVEAU, properties.path("lastVisitedOn").asText());
		assertEquals("Jean Dupont", properties.path("assignedTo").asText());
		assertEquals("2026-01-02", properties.path("assignedOn").asText());
		assertEquals("2026-03-04", properties.path("waitedFor").asText());
		// Les attributions sont encodées par leur toString() : le front ne s'en sert pas, on vérifie juste la forme.
		assertTrue(properties.path("assignments").isArray());
		assertEquals(1, properties.path("assignments").size());
		assertTrue(properties.path("assignments").get(0).isTextual());
	}

	@Test
	void convertToGeoJSON_territories_returnedAssignment_givesLastVisitedOnAndNotAssigned() throws Exception {
		Territory territory = territory("Territoire Rendu", TerritoryStatus.AVAILABLE, TerritoryType.BUILDING, square(2.35, 48.85));
		Person person = Person.builder().id(UUID.randomUUID()).firstName("marie").lastName("martin").build();
		territory.getAssignments().add(returnedAssignment(territory, person, LocalDate.of(2025, 10, 1)));
		territory.getAssignments().add(returnedAssignment(territory, person, LocalDate.of(2026, 2, 15)));

		JsonNode properties = parse(GeoJsonUtils.convertToGeoJSON(List.of(territory)))
				.path("features").get(0).path("properties");

		assertEquals("2026-02-15", properties.path("lastVisitedOn").asText());
		assertEquals(TerritoryUtils.NA, properties.path("assignedTo").asText());
		assertEquals(TerritoryUtils.NA, properties.path("assignedOn").asText());
		assertEquals(TerritoryUtils.NA, properties.path("waitedFor").asText());
		assertEquals("BUILDING", properties.path("type").asText());
		assertEquals(2, properties.path("assignments").size());
	}

	@Test
	void convertToGeoJSON_territories_nullValuesAreOmitted() throws Exception {
		Territory territory = territory(null, TerritoryStatus.AVAILABLE, null, null);

		JsonNode feature = parse(GeoJsonUtils.convertToGeoJSON(List.of(territory))).path("features").get(0);

		// FeatureJSON n'écrit ni les propriétés nulles ni la clé "geometry" quand la géométrie est nulle.
		assertFalse(feature.has("geometry"));
		JsonNode properties = feature.path("properties");
		assertEquals(Set.of("id", "status", "city", "lastVisitedOn", "assignedTo", "assignedOn", "waitedFor", "assignments"),
				propertyNames(properties));
		assertEquals(TerritoryUtils.NA, properties.path("assignedTo").asText());
		assertTrue(properties.path("assignments").isArray());
		assertEquals(0, properties.path("assignments").size());
	}

	@Test
	void convertToGeoJSON_territories_keepsOrderOfTerritories() throws Exception {
		Territory first = territory("A", TerritoryStatus.AVAILABLE, TerritoryType.HOUSE, square(1, 45));
		Territory second = territory("B", TerritoryStatus.LATE, TerritoryType.BUILDING, square(2, 46));

		JsonNode features = parse(GeoJsonUtils.convertToGeoJSON(List.of(first, second))).path("features");

		assertEquals(2, features.size());
		assertEquals(first.getId().toString(), features.get(0).path("properties").path("id").asText());
		assertEquals(second.getId().toString(), features.get(1).path("properties").path("id").asText());
		assertEquals("LATE", features.get(1).path("properties").path("status").asText());
	}

	@Test
	void convertToGeoJSON_territories_emptyList() throws Exception {
		JsonNode root = parse(GeoJsonUtils.convertToGeoJSON(List.<Territory>of()));

		assertEquals("FeatureCollection", root.path("type").asText());
		assertTrue(root.path("features").isArray());
		assertEquals(0, root.path("features").size());
	}

	// ---------- convertToGeoJSON(pâtés, enveloppe concave) ----------

	@Test
	void convertToGeoJSON_blocksAndConcaveHull() throws Exception {
		Block block1 = Block.builder().id(UUID.randomUUID()).block(squarePolygon(-1.123456789, 48.123456789)).build();
		Block block2 = Block.builder().id(UUID.randomUUID()).block(polygonWithHole()).build();

		JsonNode root = parse(GeoJsonUtils.convertToGeoJSON(List.of(block1, block2), square(-1.123456789, 48.123456789)));

		assertEquals("FeatureCollection", root.path("type").asText());
		JsonNode features = root.path("features");
		assertEquals(3, features.size());

		// Les pâtés : Polygon, id du pâté et type BLOCK
		JsonNode firstBlock = features.get(0);
		assertEquals("Polygon", firstBlock.path("geometry").path("type").asText());
		JsonNode ring = firstBlock.path("geometry").path("coordinates").get(0);
		assertEquals(5, ring.size());
		assertPoint(ring.get(0), -1.123457, 48.123457);
		assertEquals(ring.get(0), ring.get(4));
		assertAtMostSixDecimals(firstBlock.path("geometry").path("coordinates"));
		assertEquals(Set.of("id", "type"), propertyNames(firstBlock.path("properties")));
		assertEquals(block1.getId().toString(), firstBlock.path("properties").path("id").asText());
		assertEquals(GeoJsonUtils.BLOCK, firstBlock.path("properties").path("type").asText());

		JsonNode secondBlock = features.get(1);
		assertEquals("Polygon", secondBlock.path("geometry").path("type").asText());
		// Anneau extérieur + trou
		assertEquals(2, secondBlock.path("geometry").path("coordinates").size());
		assertEquals(block2.getId().toString(), secondBlock.path("properties").path("id").asText());

		// L'enveloppe concave en dernier : MultiPolygon, type CONCAVE_HULL, sans id (null donc omis)
		JsonNode hull = features.get(2);
		assertMultiPolygonSquare(hull.path("geometry"));
		assertEquals(Set.of("type"), propertyNames(hull.path("properties")));
		assertEquals(GeoJsonUtils.CONCAVE_HULL, hull.path("properties").path("type").asText());
	}

	@Test
	void convertToGeoJSON_blocksWithoutConcaveHull() throws Exception {
		Block block = Block.builder().id(UUID.randomUUID()).block(squarePolygon(3, 47)).build();

		JsonNode features = parse(GeoJsonUtils.convertToGeoJSON(List.of(block), null)).path("features");

		assertEquals(1, features.size());
		assertEquals(GeoJsonUtils.BLOCK, features.get(0).path("properties").path("type").asText());
	}

	@Test
	void convertToGeoJSON_noBlockOnlyConcaveHull() throws Exception {
		JsonNode features = parse(GeoJsonUtils.convertToGeoJSON(List.of(), square(3, 47))).path("features");

		assertEquals(1, features.size());
		assertEquals("MultiPolygon", features.get(0).path("geometry").path("type").asText());
		assertEquals(GeoJsonUtils.CONCAVE_HULL, features.get(0).path("properties").path("type").asText());
	}

	// ---------- convertToGeoJSONCampaign ----------

	@Test
	void convertToGeoJSONCampaign_marksTerritoriesUsedInCampaign() throws Exception {
		Territory done = territory("Fait", TerritoryStatus.AVAILABLE, TerritoryType.HOUSE, square(-1.123456789, 48.123456789));
		Territory remaining = territory("Restant", TerritoryStatus.ASSIGNED, TerritoryType.BUILDING, square(1, 45));
		// Une autre instance avec le même id : la comparaison se fait sur l'id (Territory.equals).
		Territory remainingCopy = Territory.builder().id(remaining.getId()).build();

		JsonNode root = parse(GeoJsonUtils.convertToGeoJSONCampaign(List.of(done, remaining), List.of(remainingCopy)));

		assertEquals("FeatureCollection", root.path("type").asText());
		JsonNode features = root.path("features");
		assertEquals(2, features.size());

		JsonNode doneFeature = features.get(0);
		assertMultiPolygonSquare(doneFeature.path("geometry"));
		JsonNode doneProperties = doneFeature.path("properties");
		assertEquals(Set.of("id", "name", "type", "usedInCampaign"), propertyNames(doneProperties));
		assertEquals(done.getId().toString(), doneProperties.path("id").asText());
		assertEquals("Fait", doneProperties.path("name").asText());
		assertEquals("HOUSE", doneProperties.path("type").asText());
		assertTrue(doneProperties.path("usedInCampaign").isBoolean());
		assertTrue(doneProperties.path("usedInCampaign").booleanValue());

		JsonNode remainingProperties = features.get(1).path("properties");
		assertEquals(remaining.getId().toString(), remainingProperties.path("id").asText());
		assertEquals("BUILDING", remainingProperties.path("type").asText());
		assertTrue(remainingProperties.path("usedInCampaign").isBoolean());
		assertFalse(remainingProperties.path("usedInCampaign").booleanValue());
	}

	@Test
	void convertToGeoJSONCampaign_nullValuesAreOmitted() throws Exception {
		Territory territory = territory(null, TerritoryStatus.AVAILABLE, null, null);

		JsonNode feature = parse(GeoJsonUtils.convertToGeoJSONCampaign(List.of(territory), List.of()))
				.path("features").get(0);

		assertFalse(feature.has("geometry"));
		assertEquals(Set.of("id", "usedInCampaign"), propertyNames(feature.path("properties")));
	}

	// ---------- convertToGeoJSONCoverage ----------

	@Test
	void convertToGeoJSONCoverage_marksTerritoriesParcourus() throws Exception {
		Territory visited = territory("Parcouru", TerritoryStatus.AVAILABLE, TerritoryType.HOUSE, square(-1.123456789, 48.123456789));
		Territory notVisited = territory("Non parcouru", TerritoryStatus.AVAILABLE, TerritoryType.BUILDING, square(1, 45));

		JsonNode root = parse(GeoJsonUtils.convertToGeoJSONCoverage(List.of(visited, notVisited), Set.of(notVisited.getId())));

		assertEquals("FeatureCollection", root.path("type").asText());
		JsonNode features = root.path("features");
		assertEquals(2, features.size());

		JsonNode visitedFeature = features.get(0);
		assertMultiPolygonSquare(visitedFeature.path("geometry"));
		JsonNode visitedProperties = visitedFeature.path("properties");
		assertEquals(Set.of("id", "name", "city", "type", "parcouru"), propertyNames(visitedProperties));
		assertEquals(visited.getId().toString(), visitedProperties.path("id").asText());
		assertEquals("Parcouru", visitedProperties.path("name").asText());
		assertEquals("Rennes", visitedProperties.path("city").asText());
		assertEquals("HOUSE", visitedProperties.path("type").asText());
		assertTrue(visitedProperties.path("parcouru").isBoolean());
		assertTrue(visitedProperties.path("parcouru").booleanValue());

		JsonNode notVisitedProperties = features.get(1).path("properties");
		assertEquals(notVisited.getId().toString(), notVisitedProperties.path("id").asText());
		assertTrue(notVisitedProperties.path("parcouru").isBoolean());
		assertFalse(notVisitedProperties.path("parcouru").booleanValue());
	}

	@Test
	void convertToGeoJSONCoverage_nullValuesAreOmitted() throws Exception {
		Territory territory = territory(null, TerritoryStatus.AVAILABLE, null, null);

		JsonNode feature = parse(GeoJsonUtils.convertToGeoJSONCoverage(List.of(territory), Set.of()))
				.path("features").get(0);

		assertFalse(feature.has("geometry"));
		assertEquals(Set.of("id", "city", "parcouru"), propertyNames(feature.path("properties")));
	}

	// ---------- Outils ----------

	private JsonNode parse(String geoJson) throws Exception {
		return objectMapper.readTree(geoJson);
	}

	private static Set<String> propertyNames(JsonNode node) {
		Set<String> names = new HashSet<>();
		node.fieldNames().forEachRemaining(names::add);
		return names;
	}

	private Territory territory(String name, TerritoryStatus status, TerritoryType type, MultiPolygon concaveHull) {
		return Territory.builder()
				.id(UUID.randomUUID())
				.name(name)
				.status(status)
				.type(type)
				.city(city)
				.concaveHull(concaveHull)
				.build();
	}

	private static Assignment returnedAssignment(Territory territory, Person person, LocalDate returnDate) {
		return Assignment.builder()
				.id(UUID.randomUUID())
				.person(person)
				.territory(territory)
				.assignmentDate(returnDate.minusMonths(2))
				.dueDate(returnDate.minusMonths(1))
				.returnDate(returnDate)
				.build();
	}

	/** Carré de 0,01° dont le coin sud-ouest est (x, y). */
	private Polygon squarePolygon(double x, double y) {
		return geometryFactory.createPolygon(new Coordinate[]{
				new Coordinate(x, y),
				new Coordinate(x + 0.01, y),
				new Coordinate(x + 0.01, y + 0.01),
				new Coordinate(x, y + 0.01),
				new Coordinate(x, y)
		});
	}

	private MultiPolygon square(double x, double y) {
		return geometryFactory.createMultiPolygon(new Polygon[]{squarePolygon(x, y)});
	}

	private Polygon polygonWithHole() {
		LinearRing shell = geometryFactory.createLinearRing(new Coordinate[]{
				new Coordinate(0, 0), new Coordinate(10, 0), new Coordinate(10, 10), new Coordinate(0, 10), new Coordinate(0, 0)
		});
		LinearRing hole = geometryFactory.createLinearRing(new Coordinate[]{
				new Coordinate(2, 2), new Coordinate(2, 4), new Coordinate(4, 4), new Coordinate(4, 2), new Coordinate(2, 2)
		});
		return geometryFactory.createPolygon(shell, new LinearRing[]{hole});
	}

	/** Vérifie un MultiPolygon issu de {@link #square(double, double)} avec le coin (-1.123456789, 48.123456789). */
	private static void assertMultiPolygonSquare(JsonNode geometry) {
		assertEquals("MultiPolygon", geometry.path("type").asText());
		JsonNode coordinates = geometry.path("coordinates");
		assertEquals(1, coordinates.size(), "un seul polygone");
		assertEquals(1, coordinates.get(0).size(), "un seul anneau");
		JsonNode ring = coordinates.get(0).get(0);
		assertEquals(5, ring.size());
		// Coordonnées arrondies à 6 décimales, ordre [longitude, latitude]
		assertPoint(ring.get(0), -1.123457, 48.123457);
		assertPoint(ring.get(2), -1.113457, 48.133457);
		assertEquals(ring.get(0), ring.get(4), "anneau fermé");
		assertAtMostSixDecimals(coordinates);
	}

	private static void assertPoint(JsonNode point, double longitude, double latitude) {
		assertEquals(2, point.size());
		assertEquals(longitude, point.get(0).doubleValue(), 1e-9);
		assertEquals(latitude, point.get(1).doubleValue(), 1e-9);
	}

	private static void assertAtMostSixDecimals(JsonNode coordinates) {
		if (coordinates.isNumber()) {
			assertTrue(coordinates.decimalValue().stripTrailingZeros().scale() <= 6,
					() -> "plus de 6 décimales : " + coordinates);
			return;
		}
		for (JsonNode child : coordinates) {
			assertAtMostSixDecimals(child);
		}
	}
}
