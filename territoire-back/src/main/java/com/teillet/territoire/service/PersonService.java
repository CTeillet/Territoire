package com.teillet.territoire.service;

import com.teillet.territoire.model.Person;
import com.teillet.territoire.repository.PersonRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PersonService {
	private final PersonRepository personRepository;

	public List<Person> getAllPersons() {
		return personRepository.findAll();
	}

	public Person createPerson(Person person) {
		return personRepository.save(person);
	}

	@Transactional
	public void deletePerson(UUID id) {
		personRepository.deletePersonById(id);
	}

	@Transactional
	public Person modifyPerson(UUID id, Person person) {
		return personRepository.save(person);
	}
}
