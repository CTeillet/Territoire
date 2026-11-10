package com.teillet.territoire.service;

import com.teillet.territoire.model.Person;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

public interface IPersonService {
	/** Archive une personne partie (sans territoire en cours) : absente des listes, son lien personnel est révoqué. */
	Person archivePerson(UUID id);

	Person restorePerson(UUID id);

	/** Remplace le nom d'une personne archivée et efface ses coordonnées ; irréversible. */
	Person anonymizePerson(UUID id);

	/** Personnes parties, la plus récemment archivée d'abord. */
	List<Person> getArchivedPersons();

	List<Person> getAllPersons();

	Person createPerson(Person person);

	@Transactional
	void deletePerson(UUID id);

	@Transactional
	Person modifyPerson(UUID id, Person person);

	@Transactional
	Person getPerson(UUID personId);
}
