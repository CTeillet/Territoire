package com.teillet.territoire.repository;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.Container.ExecResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Rôles dédiés de la production (config/postgres/roles.sql, README > Rôles PostgreSQL) : sur une copie du schéma de
 * production, le script est lancé par le propriétaire des tables, puis l'application démarre avec territoire_app et
 * Flyway avec le propriétaire, comme le prévoit docker-compose.yml. Ignoré sans Docker ; la CI en a un.
 */
@SpringBootTest(properties = {
		"spring.datasource.driver-class-name=org.postgresql.Driver",
		"spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
		"spring.jpa.properties.hibernate.default_schema=public",
		"spring.jpa.hibernate.ddl-auto=validate",
		"spring.flyway.enabled=true",
		"spring.flyway.baseline-on-migrate=true",
		"spring.flyway.baseline-version=1"
})
@Testcontainers(disabledWithoutDocker = true)
class DatabaseRolesIntegrationTest {
	private static final String APP_PASSWORD = "mot-de-passe-app";
	private static final String EXPORTER_PASSWORD = "mot-de-passe-exporter";

	@Container
	static final PostgreSQLContainer POSTGIS = new PostgreSQLContainer(
			DockerImageName.parse("postgis/postgis:17-3.6").asCompatibleSubstituteFor("postgres"))
			.withCopyFileToContainer(MountableFile.forClasspathResource("db/schema-production.sql"),
					"/docker-entrypoint-initdb.d/20_schema_production.sql")
			// Script du dépôt (dossier config/ à la racine), copié tel qu'il sera lancé sur le VPS
			.withCopyFileToContainer(MountableFile.forHostPath(Path.of("..", "config", "postgres", "roles.sql")),
					"/tmp/roles.sql");

	@Autowired private Flyway flyway;
	@Autowired private JdbcTemplate jdbcTemplate;
	@Autowired private CityRepository cityRepository;
	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private AssignmentRepository assignmentRepository;

	/** Après le démarrage du conteneur et avant celui de l'application, comme la procédure du README. */
	@BeforeAll
	static void createRoles() throws Exception {
		for (int run = 0; run < 2; run++) {
			// Deux fois : le script doit pouvoir être relancé
			ExecResult result = POSTGIS.execInContainer("psql", "-U", POSTGIS.getUsername(), "-d", POSTGIS.getDatabaseName(),
					"-v", "ON_ERROR_STOP=1", "-v", "mot_de_passe_app=" + APP_PASSWORD,
					"-v", "mot_de_passe_exporter=" + EXPORTER_PASSWORD, "-f", "/tmp/roles.sql");
			assertEquals(0, result.getExitCode(), result.getStderr());
		}
	}

	@DynamicPropertySource
	static void database(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGIS::getJdbcUrl);
		registry.add("spring.datasource.username", () -> "territoire_app");
		registry.add("spring.datasource.password", () -> APP_PASSWORD);
		// Migrations avec le propriétaire des tables (admin en production)
		registry.add("spring.flyway.user", POSTGIS::getUsername);
		registry.add("spring.flyway.password", POSTGIS::getPassword);
	}

	@Test
	void applicationWorksWithTheDedicatedRole() {
		assertEquals(0, flyway.info().pending().length, "Migrations appliquées par le propriétaire des tables");
		assertEquals("territoire_app", jdbcTemplate.queryForObject("SELECT current_user", String.class));

		City city = cityRepository.save(City.builder()
				.name("Rennes")
				.zipCode("35000")
				.center(new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-1.6777, 48.1173)))
				.build());
		Territory territory = new Territory();
		territory.setName("T1");
		territory.setCity(city);
		territory.setStatus(TerritoryStatus.AVAILABLE);
		territory.setType(TerritoryType.HOUSE);
		territory.setLastModifiedDate(LocalDate.now());
		territoryRepository.save(territory);
		Assignment assignment = assignmentRepository.save(Assignment.builder()
				.territory(territory)
				.assignmentDate(LocalDate.now())
				.dueDate(LocalDate.now().plusMonths(4))
				.build());
		assignmentRepository.delete(assignment);

		assertEquals("T1", territoryRepository.findByName("T1").getName());
	}

	@Test
	void theApplicationRoleCannotChangeTheSchemaNorReadServerFiles() {
		assertFalse(jdbcTemplate.queryForObject("SELECT rolsuper FROM pg_roles WHERE rolname = current_user", Boolean.class));
		assertThrows(Exception.class, () -> jdbcTemplate.execute("CREATE TABLE intrus (id int)"));
		assertThrows(Exception.class, () -> jdbcTemplate.execute("DROP TABLE public.assignment"));
		assertThrows(Exception.class, () -> jdbcTemplate.execute("ALTER TABLE public.city ADD COLUMN intrus int"));
		assertThrows(Exception.class, () -> jdbcTemplate.queryForObject("SELECT pg_read_file('/etc/passwd')", String.class));
	}

	@Test
	void tablesCreatedByLaterMigrationsAreOpenToTheApplication() throws SQLException {
		// Comme une future migration Flyway : table créée par le propriétaire, après le script
		try (Connection owner = DriverManager.getConnection(POSTGIS.getJdbcUrl(), POSTGIS.getUsername(), POSTGIS.getPassword());
		     Statement statement = owner.createStatement()) {
			statement.execute("CREATE TABLE public.migration_future (id bigserial PRIMARY KEY, nom text)");
		}

		jdbcTemplate.update("INSERT INTO public.migration_future (nom) VALUES ('ok')");
		assertEquals(1, jdbcTemplate.queryForObject("SELECT count(*) FROM public.migration_future", Integer.class));
	}

	@Test
	void theExporterRoleOnlySeesStatistics() throws SQLException {
		try (Connection exporter = DriverManager.getConnection(POSTGIS.getJdbcUrl(), "postgres_exporter", EXPORTER_PASSWORD);
		     Statement statement = exporter.createStatement()) {
			statement.executeQuery("SELECT datname, xact_commit FROM pg_stat_database").close();
			statement.executeQuery("SELECT count(*) FROM pg_stat_activity").close();
			assertThrows(SQLException.class, () -> statement.executeQuery("SELECT * FROM public.city"));
		}
	}
}
