package com.teillet.territoire.service;

import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.service.impl.PersonService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PersonServiceTest {

	@Mock
	private PersonRepository personRepository;

	@Mock
	private com.teillet.territoire.repository.AssignmentRepository assignmentRepository;

	@Mock
	private com.teillet.territoire.repository.TerritoryReminderRepository reminderRepository;

	@Mock
	private com.teillet.territoire.repository.PersonAccessRepository personAccessRepository;

	private PersonService personService;

	@BeforeEach
	void setUp() {
		personService = new PersonService(personRepository, assignmentRepository, reminderRepository, personAccessRepository);
	}

	@Test
	void testDeletePerson_WithAssignmentHistory_Refused() {
		UUID personId = UUID.randomUUID();
		when(assignmentRepository.findByPerson_Id(personId)).thenReturn(java.util.List.of(new com.teillet.territoire.model.Assignment()));

		assertThrows(IllegalStateException.class, () -> personService.deletePerson(personId));
		verify(personRepository, never()).deletePersonById(any());
	}

	@Test
	void testGetAllPersons() {
		Person p1 = Person.builder().id(UUID.randomUUID()).firstName("John").lastName("Doe").build();
		Person p2 = Person.builder().id(UUID.randomUUID()).firstName("Jane").lastName("Smith").build();

		when(personRepository.findAll()).thenReturn(List.of(p1, p2));

		List<Person> result = personService.getAllPersons();
		assertEquals(2, result.size());
	}

	@Test
	void testCreatePerson() {
		Person person = Person.builder().firstName("John").lastName("Doe").build();
		when(personRepository.save(any(Person.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Person created = personService.createPerson(person);
		assertNotNull(created);
		assertEquals("John", created.getFirstName());
		assertEquals("Doe", created.getLastName());
	}

	@Test
	void testDeletePerson() {
		UUID personId = UUID.randomUUID();
		doNothing().when(personRepository).deletePersonById(personId);

		personService.deletePerson(personId);
		verify(personRepository, times(1)).deletePersonById(personId);
	}

	@Test
	void testModifyPerson() {
		UUID personId = UUID.randomUUID();
		Person existing = Person.builder().id(personId).firstName("John").lastName("Doe").build();
		Person person = Person.builder().id(personId).firstName("John").lastName("Updated").build();
		when(personRepository.findById(personId)).thenReturn(Optional.of(existing));
		when(personRepository.save(any(Person.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Person modified = personService.modifyPerson(personId, person);
		assertNotNull(modified);
		assertEquals("Updated", modified.getLastName());
		assertEquals(personId, modified.getId());
	}

	@Test
	void testModifyPerson_IgnoresIdFromBody() {
		UUID pathId = UUID.randomUUID();
		UUID otherId = UUID.randomUUID();
		Person existing = Person.builder().id(pathId).firstName("John").lastName("Doe").build();
		Person body = Person.builder().id(otherId).firstName("Jane").lastName("Smith").phoneNumber("+33600000000").build();
		when(personRepository.findById(pathId)).thenReturn(Optional.of(existing));
		when(personRepository.save(any(Person.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Person modified = personService.modifyPerson(pathId, body);

		assertEquals(pathId, modified.getId());
		assertEquals("Jane", modified.getFirstName());
		assertEquals("+33600000000", modified.getPhoneNumber());
		verify(personRepository, never()).findById(otherId);
	}

	@Test
	void testModifyPerson_NotFound() {
		UUID personId = UUID.randomUUID();
		when(personRepository.findById(personId)).thenReturn(Optional.empty());

		assertThrows(NotFoundException.class,
				() -> personService.modifyPerson(personId, Person.builder().firstName("X").build()));
		verify(personRepository, never()).save(any(Person.class));
	}

	@Test
	void testCreatePerson_IgnoresIdFromBody() {
		Person person = Person.builder().id(UUID.randomUUID()).firstName("John").lastName("Doe").build();
		when(personRepository.save(any(Person.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Person created = personService.createPerson(person);
		assertNull(created.getId());
	}

	@Test
	void testGetPerson_Found() {
		UUID personId = UUID.randomUUID();
		Person person = Person.builder().id(personId).firstName("John").lastName("Doe").build();
		when(personRepository.findById(personId)).thenReturn(Optional.of(person));

		Person found = personService.getPerson(personId);
		assertNotNull(found);
		assertEquals("John", found.getFirstName());
	}

	@Test
	void testGetPerson_NotFound() {
		UUID personId = UUID.randomUUID();
		when(personRepository.findById(personId)).thenReturn(Optional.empty());

		assertThrows(RuntimeException.class, () -> personService.getPerson(personId));
	}
}
