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
public class PersonService implements IPersonService {
	private final PersonRepository personRepository;

	@Override
	public List<Person> getAllPersons() {
		System.out.println("Fetching all persons from DB...");
		return personRepository.findAll();
	}

	@Override
	public Person createPerson(Person person) {
		System.out.println("Saving new person to DB: " + person);
		return personRepository.save(person);
	}

	@Transactional
	@Override
	public void deletePerson(UUID id) {
		System.out.println("Deleting person from DB for id: " + id);
		personRepository.deletePersonById(id);
	}

	/**
	 * Modifie une personne et met à jour le cache.
	 */
	@Transactional
	@Override
	public Person modifyPerson(UUID id, Person person) {
		System.out.println("Updating person in DB for id: " + id);
		return personRepository.save(person);
	}

	@Override
	public Person getPerson(UUID personId) {
		return personRepository.findById(personId)
				.orElseThrow(() -> new RuntimeException("Territoire non trouvé"));
	}
}
