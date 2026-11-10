package com.teillet.territoire.controller;

import com.teillet.territoire.service.impl.AuditService;
import com.teillet.territoire.enums.AuditAction;
import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.dto.PersonRequest;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.IPersonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/personnes")
@RequiredArgsConstructor
@Slf4j
class PersonController {
	private final IPersonService personService;
	private final IAssignmentService assignmentService;
	private final AuditService audit;

	@GetMapping
	public List<Person> getAllPersons() {
		log.info("Début : Récupération des personnes");
		List<Person> allPersons = personService.getAllPersons();
		log.info("Fin : Récupération des personnes");
		return allPersons;
	}

	@PostMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public Person createPerson(@Valid @RequestBody PersonRequest person) {
		log.info("Début : Création personne");
		Person personCreated = personService.createPerson(person.toPerson());
		audit.person(AuditAction.PERSONNE_CREEE, personCreated.getId(), null);
		log.info("Fin : Création personne");
		return personCreated;
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void deletePerson(@PathVariable UUID id) {
		String name = audit.personName(id);
		log.info("Début : Suppression personne : {}", id);
		personService.deletePerson(id);
		audit.person(AuditAction.PERSONNE_SUPPRIMEE, id, name, null);
		log.info("Fin : Suppression personne");
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public Person modifyPerson(@PathVariable UUID id, @Valid @RequestBody PersonRequest person) {
		log.info("Début : Modification personne, id {}", id);
		Person modifiedPerson = personService.modifyPerson(id, person.toPerson());
		audit.person(AuditAction.PERSONNE_MODIFIEE, id, null);
		log.info("Fin : Modification personne");
		return modifiedPerson;
	}

	/** Personnes parties (archivées), pour les restaurer ou les anonymiser. */
	@GetMapping("/archives")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public List<Person> getArchivedPersons() {
		return personService.getArchivedPersons();
	}

	@PostMapping("/{id}/archiver")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public Person archivePerson(@PathVariable UUID id) {
		log.info("Archivage de la personne {}", id);
		Person archived = personService.archivePerson(id);
		audit.person(AuditAction.PERSONNE_ARCHIVEE, id, null);
		return archived;
	}

	@PostMapping("/{id}/restaurer")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public Person restorePerson(@PathVariable UUID id) {
		log.info("Restauration de la personne {}", id);
		Person restored = personService.restorePerson(id);
		audit.person(AuditAction.PERSONNE_RESTAUREE, id, null);
		return restored;
	}

	@PostMapping("/{id}/anonymiser")
	@PreAuthorize("hasRole('ADMIN')")
	public Person anonymizePerson(@PathVariable UUID id) {
		log.info("Anonymisation de la personne {}", id);
		Person anonymized = personService.anonymizePerson(id);
		// Son ancien nom disparaît aussi du journal
		String name = anonymized.getFirstName() + " " + anonymized.getLastName();
		audit.anonymize(id, name);
		audit.person(AuditAction.PERSONNE_ANONYMISEE, id, name, null);
		return anonymized;
	}

	@GetMapping("/{id}/territoires")
	public List<AssignmentDto> getTerritoriesByPerson(@PathVariable UUID id) {
		log.info("Début : Récupération des territoires assignés à la personne avec l'ID: {}", id);
		List<AssignmentDto> assignments = assignmentService.getAssignmentsByPersonId(id);
		log.info("Fin : Récupération des territoires assignés. Nombre trouvé: {}", assignments.size());
		return assignments;
	}
}
