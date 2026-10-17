package com.teillet.territoire.service;

import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.dto.PersonAccessStatusDto;
import com.teillet.territoire.enums.AccessStatus;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.PersonAccess;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.PersonAccessRepository;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.security.AccessLinkTokens;
import com.teillet.territoire.service.impl.PersonAccessService;
import com.teillet.territoire.utils.MessageTemplateRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Cas limites du service des liens personnels (le parcours nominal est couvert par PersonAccessIntegrationTest).
 */
@ExtendWith(MockitoExtension.class)
class PersonAccessServiceTest {
	private static final String JWT_SECRET = "dGVzdF9zZWNyZXRfa2V5X2Zvcl9qd3RfYXV0aGVudGljYXRpb25fdGVzdHNfc3ByaW5nX2Jvb3RfMTIzNDU2Nzg5MA==";
	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-11T10:00:00Z"), ZoneId.of("Europe/Paris"));

	@Mock private PersonAccessRepository accessRepository;
	@Mock private PersonRepository personRepository;
	@Mock private AssignmentRepository assignmentRepository;
	@Mock private IAssignmentService assignmentService;
	@Mock private ISettingService settingService;
	@Mock private ITerritoryRequestService territoryRequestService;
	@Mock private IWahaClient wahaClient;

	private final AccessLinkTokens tokens = new AccessLinkTokens("secret-de-test", JWT_SECRET);
	private PersonAccessService service;
	private Person person;

	@BeforeEach
	void setUp() {
		service = new PersonAccessService(accessRepository, personRepository, assignmentRepository, assignmentService,
				settingService, territoryRequestService, wahaClient, new MessageTemplateRenderer(), tokens, "https://tms.example/m", CLOCK);
		person = Person.builder().id(UUID.randomUUID()).firstName("jean").lastName("dupont").phoneNumber("+33600000000").build();
	}

	private PersonAccess access(boolean revoked, LocalDate expiresAt) {
		return PersonAccess.builder().id(UUID.randomUUID()).person(person).version(4).revoked(revoked)
				.expiresAt(expiresAt).createdAt(CLOCK.instant()).build();
	}

	private Assignment runningAssignment() {
		City city = new City();
		city.setName("Rennes");
		Territory territory = new Territory();
		territory.setId(UUID.randomUUID());
		territory.setName("R-12");
		territory.setCity(city);
		return Assignment.builder().id(UUID.randomUUID()).person(person).territory(territory)
				.assignmentDate(LocalDate.now(CLOCK)).dueDate(LocalDate.now(CLOCK).plusMonths(4)).build();
	}

	private void enableNotification() {
		when(settingService.getAccessSettings()).thenReturn(AccessSettingsDto.builder()
				.assignmentNotificationEnabled(true)
				.assignmentMessage("{{ territory.name }} {{ link }}")
				.accessLinkMessage("{{ link }}")
				.build());
	}

	// ------------------------------------------------------------ Gestion

	@Test
	void getStatus_WithoutAccess_IsAucunWithoutLink() {
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.empty());

		PersonAccessStatusDto status = service.getStatus(person.getId());

		assertEquals(AccessStatus.AUCUN, status.getStatus());
		assertNull(status.getLink());
		assertEquals("Jean Dupont", status.getPersonName());
		assertTrue(status.isHasPhone());
	}

	@Test
	void getStatus_UnknownPerson_NotFound() {
		when(personRepository.findById(any())).thenReturn(Optional.empty());

		assertThrows(NotFoundException.class, () -> service.getStatus(UUID.randomUUID()));
	}

	@Test
	void regenerate_ExistingAccess_BumpsVersionAndResetsUsage() {
		PersonAccess existing = access(true, null);
		existing.setLastUsedAt(CLOCK.instant());
		existing.setLastSentAt(CLOCK.instant());
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(existing));
		when(accessRepository.save(any(PersonAccess.class))).thenAnswer(inv -> inv.getArgument(0));

		PersonAccessStatusDto status = service.regenerate(person.getId());

		assertEquals(5, existing.getVersion());
		assertFalse(existing.isRevoked());
		assertNull(existing.getLastUsedAt());
		assertNull(existing.getLastSentAt());
		assertEquals(AccessStatus.ACTIF, status.getStatus());
		assertEquals("https://tms.example/m/" + tokens.generate(person.getId(), 5), status.getLink());
	}

	@Test
	void revoke_WithoutAccess_Refused() {
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.empty());

		assertThrows(IllegalStateException.class, () -> service.revoke(person.getId()));
	}

	@Test
	void updateExpiration_WithoutAccess_Refused() {
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.empty());

		assertThrows(IllegalStateException.class, () -> service.updateExpiration(person.getId(), LocalDate.now(CLOCK)));
	}

	@Test
	void expiredAccess_HasStatusExpireAndNoLink() {
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(access(false, LocalDate.now(CLOCK).minusDays(1))));

		PersonAccessStatusDto status = service.getStatus(person.getId());

		assertEquals(AccessStatus.EXPIRE, status.getStatus());
		assertNull(status.getLink());
	}

	@Test
	void accessExpiringToday_IsStillActive() {
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(access(false, LocalDate.now(CLOCK))));

		assertEquals(AccessStatus.ACTIF, service.getStatus(person.getId()).getStatus());
	}

	@Test
	void getAllStatuses_CountsRunningAssignmentsPerPerson() {
		Person other = Person.builder().id(UUID.randomUUID()).firstName("anne").lastName("martin").build();
		when(accessRepository.findAll()).thenReturn(List.of(access(false, null)));
		when(assignmentRepository.countRunningAssignmentsByPerson()).thenReturn(List.<Object[]>of(new Object[]{person.getId(), 2L}));
		when(personRepository.findAll()).thenReturn(List.of(person, other));

		List<PersonAccessStatusDto> statuses = service.getAllStatuses();

		assertEquals(List.of("Anne Martin", "Jean Dupont"), statuses.stream().map(PersonAccessStatusDto::getPersonName).toList());
		assertEquals(AccessStatus.AUCUN, statuses.getFirst().getStatus());
		assertEquals(0, statuses.get(0).getActiveTerritories());
		assertFalse(statuses.get(0).isHasPhone());
		assertEquals(AccessStatus.ACTIF, statuses.get(1).getStatus());
		assertEquals(2, statuses.get(1).getActiveTerritories());
	}

	@Test
	void deleteForPerson_DeletesAccess() {
		service.deleteForPerson(person.getId());

		verify(accessRepository).deleteByPerson_Id(person.getId());
	}

	// ------------------------------------------------------------ Envoi du lien

	@Test
	void sendLink_WithoutPhone_Refused() {
		person.setPhoneNumber(" ");
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));

		assertThrows(IllegalStateException.class, () -> service.sendLink(person.getId()));
		verifyNoInteractions(wahaClient);
	}

	@Test
	void sendLink_RevokedAccess_Refused() {
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(access(true, null)));

		IllegalStateException e = assertThrows(IllegalStateException.class, () -> service.sendLink(person.getId()));
		assertTrue(e.getMessage().contains("révoqué"));
		verifyNoInteractions(wahaClient);
	}

	@Test
	void sendLink_ExpiredAccess_Refused() {
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(access(false, LocalDate.now(CLOCK).minusDays(1))));

		IllegalStateException e = assertThrows(IllegalStateException.class, () -> service.sendLink(person.getId()));
		assertTrue(e.getMessage().contains("expiré"));
		verifyNoInteractions(wahaClient);
	}

	@Test
	void sendLink_WithoutAccess_CreatesItThenSends() {
		when(personRepository.findById(person.getId())).thenReturn(Optional.of(person));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.empty());
		when(accessRepository.save(any(PersonAccess.class))).thenAnswer(inv -> inv.getArgument(0));
		when(settingService.getAccessSettings()).thenReturn(AccessSettingsDto.builder().accessLinkMessage("Lien : {{ link }}").build());

		PersonAccessStatusDto status = service.sendLink(person.getId());

		verify(wahaClient).sendMessage("+33600000000", "Lien : https://tms.example/m/" + tokens.generate(person.getId(), 1));
		assertEquals(CLOCK.instant(), status.getLastSentAt());
	}

	// ------------------------------------------------------------ Message d'attribution

	@Test
	void notifyAssignment_UnknownAssignment_NothingSent() {
		enableNotification();
		when(assignmentRepository.findById(any())).thenReturn(Optional.empty());

		service.notifyAssignment(UUID.randomUUID());

		verifyNoInteractions(wahaClient);
	}

	@Test
	void notifyAssignment_AlreadyReturned_NothingSent() {
		enableNotification();
		Assignment assignment = runningAssignment();
		assignment.setReturnDate(LocalDate.now(CLOCK));
		when(assignmentRepository.findById(assignment.getId())).thenReturn(Optional.of(assignment));

		service.notifyAssignment(assignment.getId());

		verifyNoInteractions(wahaClient);
	}

	@Test
	void notifyAssignment_WithoutPhone_NothingSent() {
		enableNotification();
		person.setPhoneNumber(null);
		Assignment assignment = runningAssignment();
		when(assignmentRepository.findById(assignment.getId())).thenReturn(Optional.of(assignment));

		service.notifyAssignment(assignment.getId());

		verifyNoInteractions(wahaClient);
	}

	@Test
	void notifyAssignment_RevokedAccess_NothingSent() {
		enableNotification();
		Assignment assignment = runningAssignment();
		when(assignmentRepository.findById(assignment.getId())).thenReturn(Optional.of(assignment));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(access(true, null)));

		service.notifyAssignment(assignment.getId());

		verifyNoInteractions(wahaClient);
	}

	@Test
	void notifyAssignment_WhatsAppFailure_IsSwallowed() {
		enableNotification();
		Assignment assignment = runningAssignment();
		when(assignmentRepository.findById(assignment.getId())).thenReturn(Optional.of(assignment));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(access(false, null)));
		doThrow(new RuntimeException("WAHA indisponible")).when(wahaClient).sendMessage(anyString(), anyString());

		assertDoesNotThrow(() -> service.notifyAssignment(assignment.getId()));
		verify(accessRepository, never()).save(any());
	}

	@Test
	void notifyAssignment_Success_RendersTerritoryAndLink() {
		enableNotification();
		Assignment assignment = runningAssignment();
		PersonAccess active = access(false, null);
		when(assignmentRepository.findById(assignment.getId())).thenReturn(Optional.of(assignment));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(active));

		service.notifyAssignment(assignment.getId());

		verify(wahaClient).sendMessage("+33600000000", "R-12 https://tms.example/m/" + tokens.generate(person.getId(), 4));
		assertEquals(CLOCK.instant(), active.getLastSentAt());
	}

	// ------------------------------------------------------------ Accès public

	@Test
	void publicView_WrongVersion_NotFound() {
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(access(false, null)));
		String oldToken = tokens.generate(person.getId(), 3);

		assertThrows(NotFoundException.class, () -> service.getPublicView(oldToken));
	}

	@Test
	void publicView_RecentlyUsed_DoesNotWriteAgain() {
		PersonAccess active = access(false, null);
		active.setLastUsedAt(CLOCK.instant().minusSeconds(60));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(active));
		when(assignmentRepository.findByPerson_IdAndReturnDateIsNull(person.getId())).thenReturn(List.of());

		service.getPublicView(tokens.generate(person.getId(), 4));

		verify(accessRepository, never()).save(any());
	}

	@Test
	void publicView_OverdueAssignment_IsMarkedLate() {
		Assignment overdue = runningAssignment();
		overdue.setDueDate(LocalDate.now(CLOCK).minusDays(1));
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(access(false, null)));
		when(assignmentRepository.findByPerson_IdAndReturnDateIsNull(person.getId())).thenReturn(List.of(overdue));

		var view = service.getPublicView(tokens.generate(person.getId(), 4));

		assertTrue(view.getTerritories().getFirst().isLate());
		assertEquals("Jean", view.getFirstName());
	}

	@Test
	void returnTerritory_DelegatesWithPersonFromToken() {
		Assignment assignment = runningAssignment();
		when(accessRepository.findByPerson_Id(person.getId())).thenReturn(Optional.of(access(false, null)));
		when(assignmentRepository.findByPerson_IdAndReturnDateIsNull(person.getId())).thenReturn(List.of());

		service.returnTerritory(tokens.generate(person.getId(), 4), assignment.getTerritory().getId());

		verify(assignmentService).returnTerritoryByPerson(assignment.getTerritory().getId(), person.getId());
	}
}
