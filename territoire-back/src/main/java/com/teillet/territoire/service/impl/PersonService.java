package com.teillet.territoire.service.impl;

import java.time.Instant;
import com.teillet.territoire.repository.TerritoryRequestRepository;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.PersonAccessRepository;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.repository.TerritoryReminderRepository;
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
	private final AssignmentRepository assignmentRepository;
	private final TerritoryReminderRepository reminderRepository;
	private final PersonAccessRepository personAccessRepository;
	private final TerritoryRequestRepository territoryRequestRepository;

	@Override
	public List<Person> getAllPersons() {
		log.info("Récupération de toutes les personnes depuis la base de données...");
		// Personnes présentes seulement : les personnes parties sont listées à part (getArchivedPersons)
		List<Person> persons = personRepository.findByArchivedAtIsNull();
		log.info("{} personnes récupérées depuis la base de données.", persons.size());
		return persons;
	}

	@Override
	public Person createPerson(Person person) {
		log.info("Enregistrement d'une nouvelle personne dans la base de données");
		// Une création ne doit jamais écraser une personne existante via un id fourni dans le corps
		person.setId(null);
		Person savedPerson = personRepository.save(person);
		log.info("Personne enregistrée avec succès avec l'ID : {}", savedPerson.getId());
		return savedPerson;
	}

	@Transactional
	@Override
	public void deletePerson(UUID id) {
		log.info("Tentative de suppression de la personne avec l'ID : {}", id);
		// L'historique des attributions et des rappels est conservé : on refuse plutôt que de le perdre ou de planter en 500
		if (!assignmentRepository.findByPerson_Id(id).isEmpty() || !reminderRepository.findByPerson_Id(id).isEmpty()) {
			throw new IllegalStateException("Impossible de supprimer cette personne : elle apparaît dans l'historique des attributions ou des rappels");
		}
		// Le lien personnel n'a pas de valeur historique : il disparaît avec la personne
		personAccessRepository.deleteByPerson_Id(id);
		personRepository.deletePersonById(id);
		log.info("Personne avec l'ID {} supprimée avec succès.", id);
	}

	/**
	 * Modifie la personne identifiée par {@code id}.
	 * L'identifiant du chemin fait foi : un éventuel id présent dans le corps est ignoré,
	 * ce qui empêche de modifier (ou de créer) une autre personne que celle visée.
	 */
	@Transactional
	@Override
	public Person modifyPerson(UUID id, Person person) {
		log.info("Mise à jour de la personne dans la base de données pour l'ID : {}", id);
		Person existing = getPerson(id);
		existing.setFirstName(person.getFirstName());
		existing.setLastName(person.getLastName());
		existing.setPhoneNumber(person.getPhoneNumber());
		existing.setEmail(person.getEmail());
		Person updatedPerson = personRepository.save(existing);
		log.info("Personne avec l'ID {} mise à jour avec succès.", updatedPerson.getId());
		return updatedPerson;
	}

	@Override
	@Transactional
	public Person archivePerson(UUID id) {
		Person person = getPerson(id);
		if (!assignmentRepository.findByPerson_IdAndReturnDateIsNull(id).isEmpty()) {
			throw new IllegalStateException("Cette personne a des territoires en cours : rendez-les avant de l'archiver");
		}
		person.setArchivedAt(Instant.now());
		// Le lien personnel ne doit plus servir : révoqué (une nouvelle version invalide l'ancien lien)
		personAccessRepository.findByPerson_Id(id).ifPresent(access -> {
			access.setRevoked(true);
			access.setVersion(access.getVersion() + 1);
			personAccessRepository.save(access);
		});
		log.info("Personne {} archivée", id);
		return personRepository.save(person);
	}

	@Override
	@Transactional
	public Person restorePerson(UUID id) {
		Person person = getPerson(id);
		person.setArchivedAt(null);
		log.info("Personne {} restaurée", id);
		return personRepository.save(person);
	}

	@Override
	@Transactional
	public Person anonymizePerson(UUID id) {
		Person person = getPerson(id);
		if (person.getArchivedAt() == null) {
			throw new IllegalStateException("Archivez d'abord cette personne : seule une personne partie peut être anonymisée");
		}
		if (person.getAnonymizedAt() != null) {
			return person;
		}
		// Un nom distinct par personne anonymisée : l'historique ne mélange pas deux personnes
		person.setFirstName("Personne");
		person.setLastName("anonymisée " + id.toString().substring(0, 4));
		person.setPhoneNumber(null);
		person.setEmail(null);
		person.setAnonymizedAt(Instant.now());
		personAccessRepository.deleteByPerson_Id(id);
		// Commentaires de ses demandes de territoire : écrits par elle, ils peuvent la désigner
		territoryRequestRepository.findByPerson_Id(id).forEach(request -> request.setComment(null));
		log.info("Personne {} anonymisée", id);
		return personRepository.save(person);
	}

	@Override
	public List<Person> getArchivedPersons() {
		return personRepository.findByArchivedAtIsNotNullOrderByArchivedAtDesc();
	}

	@Override
	public Person getPerson(UUID personId) {
		log.info("Recherche de la personne avec l'ID : {}", personId);
		return personRepository.findById(personId)
				.orElseThrow(() -> {
					log.warn("Personne avec l'ID {} non trouvée.", personId);
					return new NotFoundException("Personne non trouvée");
				});
	}
}
