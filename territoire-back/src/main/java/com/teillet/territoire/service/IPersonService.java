package com.teillet.territoire.service;

import com.teillet.territoire.model.Person;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

public interface IPersonService {
	List<Person> getAllPersons();

	Person createPerson(Person person);

	@Transactional
	void deletePerson(UUID id);

	@Transactional
	Person modifyPerson(UUID id, Person person);
}
