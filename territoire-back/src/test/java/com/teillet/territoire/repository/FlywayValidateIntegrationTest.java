package com.teillet.territoire.repository;

import com.teillet.territoire.enums.Role;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.model.User;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Démarrage de l'application comme en production sur une copie du schéma de production : Flyway applique V2, puis
 * Hibernate valide que chaque entité correspond aux tables (spring.jpa.hibernate.ddl-auto=validate).
 * Le contexte ne démarre pas si une entité et le schéma divergent (nouvelle colonne sans migration, type différent...).
 * Ignoré sans Docker ; la CI en a un.
 */
@SpringBootTest(properties = {
		"spring.datasource.driver-class-name=org.postgresql.Driver",
		"spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
		// Comme en production (src/main/resources/application.properties)
		"spring.jpa.properties.hibernate.default_schema=public",
		"spring.jpa.hibernate.ddl-auto=validate",
		"spring.flyway.enabled=true",
		"spring.flyway.baseline-on-migrate=true",
		"spring.flyway.baseline-version=1"
})
@Testcontainers(disabledWithoutDocker = true)
class FlywayValidateIntegrationTest {
	@Container
	@ServiceConnection
	static final PostgreSQLContainer POSTGIS = new PostgreSQLContainer(
			DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres"))
			.withCopyFileToContainer(MountableFile.forClasspathResource("db/schema-production.sql"),
					"/docker-entrypoint-initdb.d/20_schema_production.sql");

	@Autowired private Flyway flyway;
	@Autowired private CityRepository cityRepository;
	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private UserRepository userRepository;

	@Test
	void applicationStartsAndWritesOnTheProductionSchema() {
		assertEquals(0, flyway.info().pending().length, "Toutes les migrations doivent être appliquées");

		City city = cityRepository.save(City.builder()
				.name("Rennes")
				.zipCode("35000")
				.center(new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-1.6777, 48.1173)))
				.build());
		Territory territory = new Territory();
		territory.setName("Territoire");
		territory.setCity(city);
		territory.setStatus(TerritoryStatus.AVAILABLE);
		territory.setType(TerritoryType.HOUSE);
		territory.setLastModifiedDate(LocalDate.now());
		territoryRepository.save(territory);
		User user = new User();
		user.setEmail("admin@example.com");
		user.setUsername("admin");
		user.setPassword("hash");
		user.setRole(Role.ADMIN);
		userRepository.save(user);

		assertEquals(0L, territoryRepository.findByName("Territoire").getVersion());
		assertEquals("admin", userRepository.findByEmail("admin@example.com").orElseThrow().getUsername());
	}
}
