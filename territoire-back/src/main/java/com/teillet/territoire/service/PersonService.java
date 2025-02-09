package com.teillet.territoire.service;

import com.teillet.territoire.model.Person;
import com.teillet.territoire.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

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
}
