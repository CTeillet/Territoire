package com.teillet.territoire.service;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.enums.ReturnSource;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;

/**
 * Prolongation sans échéance (POST /api/territoires/{id}/prolongation sans dueDate) sur PostgreSQL avec les migrations
 * Flyway. Le service est appelé par son proxy Spring, comme depuis le contrôleur :
 * - la clôture de l'attribution en cours et la création de la nouvelle forment une seule transaction ;
 * - la clôture est écrite avant l'insertion de la nouvelle, que l'index uk_assignment_running_territory (V5) refuserait.
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
class AssignmentServiceExtendIntegrationTest {
	@Container
	@ServiceConnection
	static final PostgreSQLContainer POSTGIS = new PostgreSQLContainer(
			DockerImageName.parse("postgis/postgis:17-3.6").asCompatibleSubstituteFor("postgres"));

	@Autowired private IAssignmentService assignmentService;
	@Autowired private ISettingService settingService;
	@Autowired private CityRepository cityRepository;
	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private PersonRepository personRepository;
	@MockitoSpyBean private AssignmentRepository assignmentRepository;

	@Test
	void extendWithoutDueDateClosesTheRunningAssignmentAndStartsANewOne() {
		LocalDate today = LocalDate.now();
		Assignment running = runningAssignment("Prolongé");

		AssignmentDto result = assignmentService.extendTerritory(running.getTerritory().getId());

		List<Assignment> assignments = assignmentsOf(running.getTerritory());
		assertEquals(2, assignments.size());
		Assignment closed = assignments.get(0);
		assertEquals(running.getId(), closed.getId());
		assertEquals(today, closed.getReturnDate());
		assertEquals(ReturnSource.PROLONGATION, closed.getReturnedVia());

		Assignment created = assignments.get(1);
		assertEquals(result.getId(), created.getId());
		assertEquals(running.getPerson().getId(), created.getPerson().getId());
		assertEquals(today, created.getAssignmentDate());
		assertEquals(today.plusMonths(settingService.getDurationSettings().getAssignmentDurationMonths()), created.getDueDate());
		assertNull(created.getReturnDate());
		assertEquals(TerritoryStatus.ASSIGNED, territoryRepository.findById(running.getTerritory().getId()).orElseThrow().getStatus());
	}

	@Test
	void extendWithoutDueDateChangesNothingWhenTheNewAssignmentCannotBeSaved() {
		Assignment running = runningAssignment("Prolongation en échec");
		doThrow(new DataAccessResourceFailureException("Connexion perdue"))
				.when(assignmentRepository).save(argThat(assignment -> assignment != null && assignment.getId() == null));

		assertThrows(DataAccessResourceFailureException.class, () -> assignmentService.extendTerritory(running.getTerritory().getId()));

		// La clôture est annulée avec le reste : le territoire garde son attribution en cours
		List<Assignment> assignments = assignmentsOf(running.getTerritory());
		assertEquals(1, assignments.size());
		assertEquals(running.getId(), assignments.getFirst().getId());
		assertNull(assignments.getFirst().getReturnDate());
		assertNull(assignments.getFirst().getReturnedVia());
		assertEquals(running.getDueDate(), assignments.getFirst().getDueDate());
	}

	/** Territoire attribué depuis trois mois : la prolongation clôt l'attribution et en crée une nouvelle. */
	private Assignment runningAssignment(String territoryName) {
		City city = cityRepository.save(City.builder()
				.name("Rennes")
				.zipCode("35000")
				.center(new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-1.6777, 48.1173)))
				.build());
		Territory territory = new Territory();
		territory.setName(territoryName);
		territory.setCity(city);
		territory.setStatus(TerritoryStatus.ASSIGNED);
		territory.setType(TerritoryType.HOUSE);
		territory.setLastModifiedDate(LocalDate.now());
		territory = territoryRepository.save(territory);
		Person person = personRepository.save(Person.builder().firstName("Jean").lastName("Dupont").build());
		return assignmentRepository.save(Assignment.builder()
				.territory(territory)
				.person(person)
				.assignmentDate(LocalDate.now().minusMonths(3))
				.dueDate(LocalDate.now().plusMonths(1))
				.build());
	}

	/** Attributions du territoire lues en base, la plus ancienne d'abord. */
	private List<Assignment> assignmentsOf(Territory territory) {
		UUID territoryId = territory.getId();
		return assignmentRepository.findAll().stream()
				.filter(assignment -> territoryId.equals(assignment.getTerritory().getId()))
				.sorted(Comparator.comparing(Assignment::getAssignmentDate))
				.toList();
	}
}
