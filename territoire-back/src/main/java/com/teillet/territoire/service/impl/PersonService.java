package com.teillet.territoire.service.impl;

import com.teillet.territoire.model.Person;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.service.IPersonService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PersonService implements IPersonService {
	private final PersonRepository personRepository;

	@Override
	public List<Person> getAllPersons() {
		log.info("Récupération de toutes les personnes depuis la base de données...");
		List<Person> persons = personRepository.findAll();
		log.info("{} personnes récupérées depuis la base de données.", persons.size());
		return persons;
	}

	@Override
	public Person createPerson(Person person) {
		log.info("Enregistrement d'une nouvelle personne dans la base de données : {}", person);
		Person savedPerson = personRepository.save(person);
		log.info("Personne enregistrée avec succès avec l'ID : {}", savedPerson.getId());
		return savedPerson;
	}

	@Transactional
	@Override
	public void deletePerson(UUID id) {
		log.info("Tentative de suppression de la personne avec l'ID : {}", id);
		personRepository.deletePersonById(id);
		log.info("Personne avec l'ID {} supprimée avec succès.", id);
	}

	/**
	 * Modifie une personne et met à jour le cache.
	 */
	@Transactional
	@Override
	public Person modifyPerson(UUID id, Person person) {
		log.info("Mise à jour de la personne dans la base de données pour l'ID : {}", id);
		Person updatedPerson = personRepository.save(person);
		log.info("Personne avec l'ID {} mise à jour avec succès.", updatedPerson.getId());
		return updatedPerson;
	}

	@Override
	public Person getPerson(UUID personId) {
		log.info("Recherche de la personne avec l'ID : {}", personId);
		return personRepository.findById(personId)
				.orElseThrow(() -> {
					log.warn("Personne avec l'ID {} non trouvée.", personId);
					return new RuntimeException("Personne non trouvée");
				});
	}
}
