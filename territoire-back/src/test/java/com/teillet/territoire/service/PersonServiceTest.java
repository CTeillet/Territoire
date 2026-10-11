package com.teillet.territoire.service;

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

	private PersonService personService;

	@BeforeEach
	void setUp() {
		personService = new PersonService(personRepository);
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
		Person person = Person.builder().id(personId).firstName("John").lastName("Updated").build();
		when(personRepository.save(any(Person.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Person modified = personService.modifyPerson(personId, person);
		assertNotNull(modified);
		assertEquals("Updated", modified.getLastName());
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
