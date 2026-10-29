package com.teillet.territoire.repository;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Migration V2 (schéma complet) sur l'image PostGIS de production :
 * - sur une copie du schéma de production au 2026-10-29 (db/schema-production.sql), elle ne change rien ;
 * - sur une base vide, elle crée exactement ce schéma (colonnes, types, valeurs par défaut, contraintes, index).
 * Les migrations suivantes (V3...) changent le schéma : elles sont vérifiées par FlywayValidateIntegrationTest.
 * Ignoré sans Docker ; la CI en a un.
 */
@Testcontainers(disabledWithoutDocker = true)
class FlywaySchemaIntegrationTest {
	private static final DockerImageName POSTGIS = DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres");

	/** Schéma de production avant migration, chargé par le script d'initialisation de l'image. */
	@Container
	static final PostgreSQLContainer PRODUCTION = new PostgreSQLContainer(POSTGIS)
			.withCopyFileToContainer(MountableFile.forClasspathResource("db/schema-production.sql"),
					"/docker-entrypoint-initdb.d/20_schema_production.sql");

	@Container
	static final PostgreSQLContainer EMPTY = new PostgreSQLContainer(POSTGIS);

	@Test
	void migrationsChangeNothingOnTheProductionSchema() throws SQLException {
		List<String> before = schema(PRODUCTION);
		assertTrue(before.contains("colonne territory.version bigint NOT NULL DEFAULT 0")
				&& before.contains("colonne territory.concave_hull geometry(MultiPolygon,4326)"), "Schéma lu : " + before);

		MigrateResult result = migrate(PRODUCTION);

		assertEquals(1, result.migrationsExecuted, "Seule V2 doit s'exécuter après la baseline de production");
		assertEquals(before, schema(PRODUCTION));
	}

	@Test
	void migrationsCreateTheProductionSchemaOnAnEmptyDatabase() throws SQLException {
		migrate(EMPTY);

		assertEquals(schema(PRODUCTION), schema(EMPTY));
	}

	/** Même configuration que l'application (src/main/resources/application.properties), jusqu'à V2. */
	private static MigrateResult migrate(PostgreSQLContainer database) {
		return Flyway.configure()
				.dataSource(database.getJdbcUrl(), database.getUsername(), database.getPassword())
				.locations("classpath:db/migration")
				.baselineOnMigrate(true)
				.baselineVersion("1")
				.target("2")
				.load()
				.migrate();
	}

	/** Colonnes (type exact, NOT NULL, valeur par défaut), contraintes et index du schéma public, hors tables techniques. */
	private static List<String> schema(PostgreSQLContainer database) throws SQLException {
		String excluded = "('flyway_schema_history', 'spatial_ref_sys')";
		String query = """
				SELECT 'colonne ' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
				       || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END
				       || COALESCE(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')
				FROM pg_attribute a
				JOIN pg_class c ON c.oid = a.attrelid
				JOIN pg_namespace n ON n.oid = c.relnamespace
				LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
				WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
				  AND c.relname NOT IN %1$s
				UNION ALL
				SELECT 'contrainte ' || c.relname || ' ' || con.conname || ' ' || pg_get_constraintdef(con.oid)
				FROM pg_constraint con
				JOIN pg_class c ON c.oid = con.conrelid
				JOIN pg_namespace n ON n.oid = c.relnamespace
				WHERE n.nspname = 'public' AND c.relname NOT IN %1$s
				UNION ALL
				SELECT 'index ' || indexname || ' ' || indexdef
				FROM pg_indexes
				WHERE schemaname = 'public' AND tablename NOT IN %1$s
				ORDER BY 1
				""".formatted(excluded);
		List<String> lines = new ArrayList<>();
		try (Connection connection = DriverManager.getConnection(database.getJdbcUrl(), database.getUsername(), database.getPassword());
		     Statement statement = connection.createStatement();
		     ResultSet rows = statement.executeQuery(query)) {
			while (rows.next()) {
				lines.add(rows.getString(1));
			}
		}
		return lines;
	}
}
