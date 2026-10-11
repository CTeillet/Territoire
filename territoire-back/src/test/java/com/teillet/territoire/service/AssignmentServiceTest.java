package com.teillet.territoire.service;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Campaign;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.service.impl.AssignmentService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssignmentServiceTest {

	@Mock
	private AssignmentRepository assignmentRepository;

	@Mock
	private ITerritoryService territoryService;

	@Mock
	private IPersonService personService;

	private AssignmentService assignmentService;

	private Territory territory;
	private Person person;
	private UUID territoryId;
	private UUID personId;

	@BeforeEach
	void setUp() {
		assignmentService = new AssignmentService(assignmentRepository, territoryService, personService);

		territoryId = UUID.randomUUID();
		personId = UUID.randomUUID();

		City city = new City();
		city.setId(UUID.randomUUID());
		city.setName("Paris");

		territory = new Territory();
		territory.setId(territoryId);
		territory.setName("T1");
		territory.setStatus(TerritoryStatus.AVAILABLE);
		territory.setCity(city);

		person = Person.builder()
				.id(personId)
				.firstName("John")
				.lastName("Doe")
				.build();
	}

	@Test
	void testAssignTerritory_Success() {
		when(personService.getPerson(personId)).thenReturn(person);
		when(territoryService.getTerritory(territoryId)).thenReturn(territory);
		when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> {
			Assignment a = invocation.getArgument(0);
			a.setId(UUID.randomUUID());
			return a;
		});

		AssignmentDto result = assignmentService.assignTerritory(territoryId, personId);

		assertNotNull(result);
		verify(territoryService, times(1)).updateTerritoryStatus(territory, TerritoryStatus.ASSIGNED);
		verify(assignmentRepository, times(1)).save(any(Assignment.class));
	}

	@Test
	void testAssignTerritory_NotAvailable_ThrowsException() {
		territory.setStatus(TerritoryStatus.ASSIGNED);
		when(personService.getPerson(personId)).thenReturn(person);
		when(territoryService.getTerritory(territoryId)).thenReturn(territory);

		assertThrows(IllegalStateException.class, () -> assignmentService.assignTerritory(territoryId, personId));
		verify(assignmentRepository, never()).save(any());
	}

	@Test
	void testReturnTerritory_Success() {
		UUID assignmentId = UUID.randomUUID();
		Assignment runningAssignment = Assignment.builder()
				.id(assignmentId)
				.territory(territory)
				.person(person)
				.assignmentDate(LocalDate.now().minusMonths(1))
				.dueDate(LocalDate.now().plusMonths(3))
				.build();

		when(assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId))
				.thenReturn(Optional.of(runningAssignment));
		when(assignmentRepository.findById(assignmentId))
				.thenReturn(Optional.of(runningAssignment));

		AssignmentDto result = assignmentService.returnTerritory(territoryId);

		assertNotNull(result);
		assertNotNull(runningAssignment.getReturnDate());
		assertEquals(LocalDate.now(), runningAssignment.getReturnDate());
		verify(assignmentRepository, times(1)).save(runningAssignment);
		verify(territoryService, times(1)).updateTerritoryStatus(territory, TerritoryStatus.PENDING);
	}

	@Test
	void testReturnTerritory_NoRunningAssignment_ThrowsException() {
		when(assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId))
				.thenReturn(Optional.empty());

		assertThrows(EntityNotFoundException.class, () -> assignmentService.returnTerritory(territoryId));
	}

	@Test
	void testCheckOverdueAssignments() {
		Assignment overdue = Assignment.builder()
				.id(UUID.randomUUID())
				.territory(territory)
				.person(person)
				.assignmentDate(LocalDate.now().minusMonths(5))
				.dueDate(LocalDate.now().minusMonths(1))
				.build();

		territory.setStatus(TerritoryStatus.ASSIGNED);
		when(assignmentRepository.findByDueDateBeforeAndReturnDateIsNull(any(LocalDate.class)))
				.thenReturn(List.of(overdue));

		assignmentService.checkOverdueAssignments();

		// updateTerritoryStatus ne touche pas à lastModifiedDate (contrairement à saveTerritory)
		verify(territoryService, times(1)).updateTerritoryStatus(territory, TerritoryStatus.LATE);
		verify(territoryService, never()).saveTerritory(any());
	}

	@Test
	void testCheckOverdueAssignments_AlreadyLateIsSkipped() {
		Assignment overdue = Assignment.builder()
				.id(UUID.randomUUID())
				.territory(territory)
				.person(person)
				.assignmentDate(LocalDate.now().minusMonths(5))
				.dueDate(LocalDate.now().minusMonths(1))
				.build();
		territory.setStatus(TerritoryStatus.LATE);
		when(assignmentRepository.findByDueDateBeforeAndReturnDateIsNull(any(LocalDate.class)))
				.thenReturn(List.of(overdue));

		assignmentService.checkOverdueAssignments();

		verify(territoryService, never()).updateTerritoryStatus(any(), any());
	}

	@Test
	void testExtendTerritory_Success() {
		LocalDate newDueDate = LocalDate.now().plusMonths(6);
		Assignment running = Assignment.builder()
				.id(UUID.randomUUID())
				.territory(territory)
				.person(person)
				.dueDate(LocalDate.now().plusMonths(2))
				.build();

		when(assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId))
				.thenReturn(Optional.of(running));
		when(assignmentRepository.save(any(Assignment.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));

		AssignmentDto result = assignmentService.extendTerritory(territoryId, newDueDate);

		assertNotNull(result);
		assertEquals(newDueDate, running.getDueDate());
	}

	@Test
	void testCancelAssignment_Success() {
		Assignment running = Assignment.builder()
				.id(UUID.randomUUID())
				.territory(territory)
				.person(person)
				.build();

		when(assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId))
				.thenReturn(Optional.of(running));

		AssignmentDto result = assignmentService.cancelAssignment(territoryId);

		assertNotNull(result);
		verify(territoryService, times(1)).updateTerritoryStatus(territory, TerritoryStatus.AVAILABLE);
		verify(assignmentRepository, times(1)).delete(running);
	}

	@Test
	void testCreateCampaignAssignments() {
		Campaign campaign = new Campaign();
		campaign.setId(UUID.randomUUID());
		campaign.setName("Campaign 2024");
		campaign.setStartDate(LocalDate.of(2024, 1, 1));
		campaign.setEndDate(LocalDate.of(2024, 2, 1));

		assignmentService.createCampaignAssignments(campaign, List.of(territory));

		ArgumentCaptor<Assignment> captor = ArgumentCaptor.forClass(Assignment.class);
		verify(assignmentRepository, times(1)).save(captor.capture());

		Assignment saved = captor.getValue();
		assertEquals(campaign, saved.getCampaign());
		assertEquals(territory, saved.getTerritory());
		assertEquals(campaign.getStartDate(), saved.getAssignmentDate());
		assertEquals(campaign.getEndDate(), saved.getReturnDate());
	}

	@Test
	void testUpdateAssignmentDate_ChangesToLate() {
		LocalDate pastDate = LocalDate.now().minusMonths(5);
		Assignment running = Assignment.builder()
				.id(UUID.randomUUID())
				.territory(territory)
				.person(person)
				.assignmentDate(LocalDate.now())
				.dueDate(LocalDate.now().plusMonths(4))
				.build();

		when(assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId))
				.thenReturn(Optional.of(running));
		when(assignmentRepository.save(any(Assignment.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));

		assignmentService.updateAssignmentDate(territoryId, pastDate);

		assertEquals(pastDate, running.getAssignmentDate());
		assertEquals(pastDate.plusMonths(4), running.getDueDate());
		verify(territoryService, times(1)).updateTerritoryStatus(territory, TerritoryStatus.LATE);
	}

	@Test
	void testGetAssignmentsByPersonId() {
		Assignment a = Assignment.builder()
				.id(UUID.randomUUID())
				.territory(territory)
				.person(person)
				.build();

		when(assignmentRepository.findByPerson_Id(personId)).thenReturn(List.of(a));

		List<AssignmentDto> results = assignmentService.getAssignmentsByPersonId(personId);
		assertEquals(1, results.size());
	}
}
