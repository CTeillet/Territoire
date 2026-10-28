package com.teillet.territoire.service;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.dto.DurationSettingsDto;
import com.teillet.territoire.dto.UpdateAssignmentDatesDto;
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

	@Mock
	private org.springframework.context.ApplicationEventPublisher eventPublisher;

	@Mock
	private ISettingService settingService;

	private AssignmentService assignmentService;

	private Territory territory;
	private Person person;
	private UUID territoryId;
	private UUID personId;

	@BeforeEach
	void setUp() {
		assignmentService = new AssignmentService(assignmentRepository, territoryService, personService, eventPublisher, settingService);
		lenient().when(settingService.getDurationSettings()).thenReturn(new DurationSettingsDto(4, 4));

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
		assertEquals(LocalDate.now().plusMonths(4), result.getDueDate());
		verify(territoryService, times(1)).updateTerritoryStatus(territory, TerritoryStatus.ASSIGNED);
		verify(assignmentRepository, times(1)).save(any(Assignment.class));
		// Le message WhatsApp éventuel est déclenché par un événement traité après validation
		verify(eventPublisher).publishEvent(any(com.teillet.territoire.event.TerritoryAssignedEvent.class));
	}

	@Test
	void testReturnTerritoryByPerson_OtherPerson_Refused() {
		Assignment running = Assignment.builder().id(UUID.randomUUID()).territory(territory).person(person).build();
		when(assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId)).thenReturn(java.util.Optional.of(running));

		assertThrows(com.teillet.territoire.exception.NotFoundException.class,
				() -> assignmentService.returnTerritoryByPerson(territoryId, UUID.randomUUID()));
		assertNull(running.getReturnDate());
		verify(territoryService, never()).updateTerritoryStatus(any(), any());
	}

	@Test
	void testReturnTerritoryByPerson_MarksReturnSource() {
		Assignment running = Assignment.builder().id(UUID.randomUUID()).territory(territory).person(person).build();
		when(assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId)).thenReturn(java.util.Optional.of(running));
		when(assignmentRepository.findById(running.getId())).thenReturn(java.util.Optional.of(running));

		assignmentService.returnTerritoryByPerson(territoryId, personId);

		assertEquals(LocalDate.now(), running.getReturnDate());
		assertEquals(com.teillet.territoire.enums.ReturnSource.LIEN, running.getReturnedVia());
		verify(territoryService).updateTerritoryStatus(territory, TerritoryStatus.PENDING);
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
	void testAssignAndExtend_UseAssignmentDurationSetting() {
		when(settingService.getDurationSettings()).thenReturn(new DurationSettingsDto(2, 4));
		when(personService.getPerson(personId)).thenReturn(person);
		when(territoryService.getTerritory(territoryId)).thenReturn(territory);
		when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

		AssignmentDto assigned = assignmentService.assignTerritory(territoryId, personId);
		assertEquals(LocalDate.now().plusMonths(2), assigned.getDueDate());

		Assignment running = Assignment.builder().id(UUID.randomUUID()).territory(territory).person(person)
				.dueDate(LocalDate.now().minusDays(1)).build();
		when(assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId)).thenReturn(Optional.of(running));

		assignmentService.extendTerritory(territoryId);
		assertEquals(LocalDate.now().plusMonths(2), running.getDueDate());
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
		verify(territoryService, times(1)).updateTerritoryStatus(territory, TerritoryStatus.PENDING);
	}

	@Test
	void testCreateCampaignAssignments_KeepsStatusOfTerritoryStillInUse() {
		Campaign campaign = new Campaign();
		campaign.setStartDate(LocalDate.of(2024, 1, 1));
		campaign.setEndDate(LocalDate.of(2024, 2, 1));

		Territory assigned = new Territory();
		assigned.setStatus(TerritoryStatus.ASSIGNED);
		Territory late = new Territory();
		late.setStatus(TerritoryStatus.LATE);
		Territory pending = new Territory();
		pending.setStatus(TerritoryStatus.PENDING);

		assignmentService.createCampaignAssignments(campaign, List.of(assigned, late, pending));

		verify(assignmentRepository, times(3)).save(any(Assignment.class));
		verify(territoryService, never()).updateTerritoryStatus(any(), any());
	}

	private Assignment historyAssignment(LocalDate assignmentDate, LocalDate dueDate, LocalDate returnDate) {
		Assignment assignment = Assignment.builder()
				.id(UUID.randomUUID())
				.territory(territory)
				.person(person)
				.assignmentDate(assignmentDate)
				.dueDate(dueDate)
				.returnDate(returnDate)
				.build();
		territory.getAssignments().add(assignment);
		lenient().when(assignmentRepository.findById(assignment.getId())).thenReturn(Optional.of(assignment));
		return assignment;
	}

	private static UpdateAssignmentDatesDto dates(LocalDate assignmentDate, LocalDate dueDate, LocalDate returnDate) {
		UpdateAssignmentDatesDto dto = new UpdateAssignmentDatesDto();
		dto.setAssignmentDate(assignmentDate);
		dto.setDueDate(dueDate);
		dto.setReturnDate(returnDate);
		return dto;
	}

	@Test
	void testUpdateAssignmentDates_RunningPastDueDate_SetsLate() {
		LocalDate today = LocalDate.now();
		territory.setStatus(TerritoryStatus.ASSIGNED);
		Assignment running = historyAssignment(today, today.plusMonths(4), null);
		when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

		assignmentService.updateAssignmentDates(running.getId(), dates(today.minusMonths(5), today.minusMonths(1), null));

		assertEquals(today.minusMonths(5), running.getAssignmentDate());
		assertEquals(today.minusMonths(1), running.getDueDate());
		verify(territoryService).updateTerritoryStatus(territory, TerritoryStatus.LATE);
	}

	@Test
	void testUpdateAssignmentDates_LateWithFutureDueDate_SetsAssignedAndKeepsDueDate() {
		LocalDate today = LocalDate.now();
		territory.setStatus(TerritoryStatus.LATE);
		Assignment running = historyAssignment(today.minusMonths(5), today.minusMonths(1), null);
		when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

		// L'échéance saisie est conservée (pas recalculée à attribution + 4 mois)
		assignmentService.updateAssignmentDates(running.getId(), dates(today.minusMonths(5), today.plusWeeks(2), null));

		assertEquals(today.plusWeeks(2), running.getDueDate());
		verify(territoryService).updateTerritoryStatus(territory, TerritoryStatus.ASSIGNED);
	}

	@Test
	void testUpdateAssignmentDates_ReturnOlderThanFourMonths_SetsAvailable() {
		LocalDate today = LocalDate.now();
		territory.setStatus(TerritoryStatus.PENDING);
		Assignment returned = historyAssignment(today.minusMonths(2), today.plusMonths(2), today.minusMonths(1));
		when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

		assignmentService.updateAssignmentDates(returned.getId(), dates(today.minusMonths(8), today.minusMonths(4), today.minusMonths(5)));

		assertEquals(today.minusMonths(5), returned.getReturnDate());
		verify(territoryService).updateTerritoryStatus(territory, TerritoryStatus.AVAILABLE);
	}

	@Test
	void testUpdateAssignmentDates_RecentReturn_SetsPending() {
		LocalDate today = LocalDate.now();
		territory.setStatus(TerritoryStatus.AVAILABLE);
		Assignment returned = historyAssignment(today.minusMonths(8), today.minusMonths(4), today.minusMonths(5));
		when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

		assignmentService.updateAssignmentDates(returned.getId(), dates(today.minusMonths(3), today.plusMonths(1), today.minusWeeks(1)));

		verify(territoryService).updateTerritoryStatus(territory, TerritoryStatus.PENDING);
	}

	@Test
	void testUpdateAssignmentDates_UsesPendingDurationSetting() {
		when(settingService.getDurationSettings()).thenReturn(new DurationSettingsDto(4, 6));
		LocalDate today = LocalDate.now();
		territory.setStatus(TerritoryStatus.AVAILABLE);
		Assignment returned = historyAssignment(today.minusMonths(8), today.minusMonths(4), today.minusMonths(7));
		when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

		// Rendu il y a 5 mois avec une attente de 6 mois : de nouveau en attente
		assignmentService.updateAssignmentDates(returned.getId(), dates(today.minusMonths(8), today.minusMonths(4), today.minusMonths(5)));

		verify(territoryService).updateTerritoryStatus(territory, TerritoryStatus.PENDING);
	}

	@Test
	void testUpdateAssignmentDates_OldAssignmentWhileRunning_KeepsStatus() {
		LocalDate today = LocalDate.now();
		territory.setStatus(TerritoryStatus.ASSIGNED);
		historyAssignment(today.minusMonths(1), today.plusMonths(3), null);
		Assignment old = historyAssignment(today.minusYears(1), today.minusMonths(8), today.minusMonths(9));
		when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

		assignmentService.updateAssignmentDates(old.getId(), dates(today.minusMonths(3), today.plusMonths(1), today.minusWeeks(6)));

		verify(territoryService, never()).updateTerritoryStatus(any(), any());
	}

	@Test
	void testUpdateAssignmentDates_InvalidDates_Rejected() {
		LocalDate today = LocalDate.now();
		Assignment running = historyAssignment(today.minusMonths(1), today.plusMonths(3), null);
		Assignment returned = historyAssignment(today.minusMonths(6), today.minusMonths(2), today.minusMonths(3));

		List<Runnable> invalidUpdates = List.of(
				// Attribution dans le futur
				() -> assignmentService.updateAssignmentDates(running.getId(), dates(today.plusDays(1), today.plusMonths(4), null)),
				// Échéance avant l'attribution
				() -> assignmentService.updateAssignmentDates(running.getId(), dates(today.minusMonths(1), today.minusMonths(2), null)),
				// Retour d'une attribution en cours : passe par l'action « Retour »
				() -> assignmentService.updateAssignmentDates(running.getId(), dates(today.minusMonths(1), today.plusMonths(3), today)),
				// Date de retour effacée
				() -> assignmentService.updateAssignmentDates(returned.getId(), dates(today.minusMonths(6), today.minusMonths(2), null)),
				// Retour avant l'attribution
				() -> assignmentService.updateAssignmentDates(returned.getId(), dates(today.minusMonths(6), today.minusMonths(2), today.minusMonths(7))),
				// Retour dans le futur
				() -> assignmentService.updateAssignmentDates(returned.getId(), dates(today.minusMonths(6), today.minusMonths(2), today.plusDays(1)))
		);

		for (Runnable update : invalidUpdates) {
			assertThrows(IllegalArgumentException.class, update::run);
		}
		assertEquals(today.minusMonths(1), running.getAssignmentDate());
		assertEquals(today.minusMonths(3), returned.getReturnDate());
		verify(assignmentRepository, never()).save(any());
		verify(territoryService, never()).updateTerritoryStatus(any(), any());
	}

	@Test
	void testUpdateAssignmentDates_NotFound() {
		UUID unknown = UUID.randomUUID();
		when(assignmentRepository.findById(unknown)).thenReturn(Optional.empty());
		LocalDate today = LocalDate.now();

		assertThrows(com.teillet.territoire.exception.NotFoundException.class,
				() -> assignmentService.updateAssignmentDates(unknown, dates(today, today.plusMonths(4), null)));
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
