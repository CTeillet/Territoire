package com.teillet.territoire.service;

import com.teillet.territoire.dto.TerritoryReminderDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.model.TerritoryReminder;
import com.teillet.territoire.repository.TerritoryReminderRepository;
import com.teillet.territoire.service.impl.TerritoryReminderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TerritoryReminderServiceTest {

	@Mock
	private TerritoryReminderRepository territoryReminderRepository;

	@Mock
	private ITerritoryService territoryService;

	@Mock
	private IPersonService personService;

	@Mock
	private IWahaClient wahaClient;

	@InjectMocks
	private TerritoryReminderService territoryReminderService;

	private UUID territoryId;
	private UUID personId;
	private Territory territory;
	private Person person;

	@BeforeEach
	void setUp() {
		territoryId = UUID.randomUUID();
		personId = UUID.randomUUID();

		territory = Territory.builder()
				.id(territoryId)
				.name("Territoire 1")
				.status(TerritoryStatus.LATE)
				.build();

		person = Person.builder()
				.id(personId)
				.firstName("John")
				.lastName("Doe")
				.phoneNumber("+33612345678")
				.build();
	}

	@Test
	void testCreateReminder_Success() {
		when(territoryService.getTerritory(territoryId)).thenReturn(territory);
		when(personService.getPerson(personId)).thenReturn(person);
		when(territoryReminderRepository.existsByTerritories_IdAndPerson_Id(territoryId, personId)).thenReturn(false);

		TerritoryReminder saved = TerritoryReminder.builder()
				.id(UUID.randomUUID())
				.territories(List.of(territory))
				.person(person)
				.reminderDate(LocalDate.now())
				.notes("Notes de test")
				.build();
		when(territoryReminderRepository.save(any(TerritoryReminder.class))).thenReturn(saved);

		TerritoryReminderDto dto = territoryReminderService.createReminder(List.of(territoryId), personId, "Notes de test");

		assertNotNull(dto);
		assertEquals(personId, dto.getPersonId());
		verify(territoryReminderRepository).save(any(TerritoryReminder.class));
	}

	@Test
	void testCreateReminder_ThrowsWhenAllAlreadyReminded() {
		when(territoryService.getTerritory(territoryId)).thenReturn(territory);
		when(personService.getPerson(personId)).thenReturn(person);
		when(territoryReminderRepository.existsByTerritories_IdAndPerson_Id(territoryId, personId)).thenReturn(true);

		assertThrows(ResponseStatusException.class, () ->
				territoryReminderService.createReminder(List.of(territoryId), personId, "Notes"));
		verify(territoryReminderRepository, never()).save(any());
	}

	@Test
	void testSendWhatsAppReminder_Success() {
		when(personService.getPerson(personId)).thenReturn(person);
		when(territoryService.getTerritory(territoryId)).thenReturn(territory);
		when(territoryReminderRepository.existsByTerritories_IdAndPerson_Id(territoryId, personId)).thenReturn(false);

		TerritoryReminder saved = TerritoryReminder.builder()
				.id(UUID.randomUUID())
				.territories(List.of(territory))
				.person(person)
				.reminderDate(LocalDate.now())
				.messageSend("Message WhatsApp")
				.build();
		when(territoryReminderRepository.save(any(TerritoryReminder.class))).thenReturn(saved);

		TerritoryReminderDto dto = territoryReminderService.sendWhatsAppReminder(List.of(territoryId), personId, "Message WhatsApp");

		assertNotNull(dto);
		verify(wahaClient).sendMessage("+33612345678", "Message WhatsApp");
		verify(territoryReminderRepository).save(any(TerritoryReminder.class));
	}

	@Test
	void testSendWhatsAppReminder_SendFails_ReminderIsRemoved() {
		when(personService.getPerson(personId)).thenReturn(person);
		when(territoryService.getTerritory(territoryId)).thenReturn(territory);
		TerritoryReminder saved = TerritoryReminder.builder()
				.id(UUID.randomUUID()).person(person).territories(List.of(territory)).reminderDate(LocalDate.now()).build();
		when(territoryReminderRepository.save(any(TerritoryReminder.class))).thenReturn(saved);
		doThrow(new IllegalStateException("WAHA indisponible")).when(wahaClient).sendMessage(any(), any());

		assertThrows(IllegalStateException.class, () ->
				territoryReminderService.sendWhatsAppReminder(List.of(territoryId), personId, "Message"));

		verify(territoryReminderRepository).delete(saved);
	}

	@Test
	void testSendWhatsAppReminder_EmptyTerritoryIds_ThrowsException() {
		assertThrows(IllegalArgumentException.class, () ->
				territoryReminderService.sendWhatsAppReminder(Collections.emptyList(), personId, "Message"));
	}

	@Test
	void testSendWhatsAppReminder_NoPhoneNumber_ThrowsException() {
		person.setPhoneNumber(null);
		when(personService.getPerson(personId)).thenReturn(person);

		assertThrows(IllegalStateException.class, () ->
				territoryReminderService.sendWhatsAppReminder(List.of(territoryId), personId, "Message"));
	}

	@Test
	void testSendWhatsAppReminder_BlankMessage_ThrowsException() {
		when(personService.getPerson(personId)).thenReturn(person);

		assertThrows(IllegalArgumentException.class, () ->
				territoryReminderService.sendWhatsAppReminder(List.of(territoryId), personId, "  "));
	}

	@Test
	void testSendWhatsAppReminder_TerritoryNotLate_ThrowsException() {
		territory.setStatus(TerritoryStatus.ASSIGNED);
		when(personService.getPerson(personId)).thenReturn(person);
		when(territoryService.getTerritory(territoryId)).thenReturn(territory);

		assertThrows(IllegalStateException.class, () ->
				territoryReminderService.sendWhatsAppReminder(List.of(territoryId), personId, "Message"));
	}

	@Test
	void testSendWhatsAppReminder_AllAlreadyReminded_ThrowsException() {
		when(personService.getPerson(personId)).thenReturn(person);
		when(territoryService.getTerritory(territoryId)).thenReturn(territory);
		when(territoryReminderRepository.existsByTerritories_IdAndPerson_Id(territoryId, personId)).thenReturn(true);

		assertThrows(ResponseStatusException.class, () ->
				territoryReminderService.sendWhatsAppReminder(List.of(territoryId), personId, "Message"));
	}

	@Test
	void testGetRemindersByTerritory() {
		when(territoryReminderRepository.findByTerritories_Id(territoryId)).thenReturn(List.of(
				TerritoryReminder.builder()
						.id(UUID.randomUUID())
						.territories(List.of(territory))
						.person(person)
						.reminderDate(LocalDate.now())
						.build()
		));

		List<TerritoryReminderDto> result = territoryReminderService.getRemindersByTerritory(territoryId);
		assertEquals(1, result.size());
		verify(territoryService).getTerritory(territoryId);
	}

	@Test
	void testGetRemindersByPerson() {
		when(territoryReminderRepository.findByPerson_Id(personId)).thenReturn(List.of(
				TerritoryReminder.builder()
						.id(UUID.randomUUID())
						.territories(List.of(territory))
						.person(person)
						.reminderDate(LocalDate.now())
						.build()
		));

		List<TerritoryReminderDto> result = territoryReminderService.getRemindersByPerson(personId);
		assertEquals(1, result.size());
		verify(personService).getPerson(personId);
	}

	@Test
	void testGetAllReminders() {
		when(territoryReminderRepository.findAll()).thenReturn(List.of(
				TerritoryReminder.builder()
						.id(UUID.randomUUID())
						.territories(List.of(territory))
						.person(person)
						.reminderDate(LocalDate.now())
						.build()
		));

		List<TerritoryReminderDto> result = territoryReminderService.getAllReminders();
		assertEquals(1, result.size());
	}

	@Test
	void testHasReminder() {
		when(territoryReminderRepository.existsByTerritories_IdAndPerson_Id(territoryId, personId)).thenReturn(true);
		assertTrue(territoryReminderService.hasReminder(territoryId, personId));
	}
}
