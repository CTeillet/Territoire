package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.IPersonService;
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

	@GetMapping
	public List<Person> getAllPersons() {
		log.info("Début : Récupération des personnes");
		List<Person> allPersons = personService.getAllPersons();
		log.info("Fin : Récupération des personnes");
		return allPersons;
	}

	@PostMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public Person createPerson(@RequestBody Person person) {
		log.info("Début : Création personne : {}", person);
		Person personCreated = personService.createPerson(person);
		log.info("Fin : Création personne");
		return personCreated;
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void deletePerson(@PathVariable UUID id) {
		log.info("Début : Suppression personne : {}", id);
		personService.deletePerson(id);
		log.info("Fin : Suppression personne");
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public Person modifyPerson(@PathVariable UUID id, @RequestBody Person person) {
		log.info("Début : Modification personne, id {} : {}", id, person);
		Person modifiedPerson = personService.modifyPerson(id, person);
		log.info("Fin : Modification personne");
		return modifiedPerson;
	}

	@GetMapping("/{id}/territoires")
	public List<AssignmentDto> getTerritoriesByPerson(@PathVariable UUID id) {
		log.info("Début : Récupération des territoires assignés à la personne avec l'ID: {}", id);
		List<AssignmentDto> assignments = assignmentService.getAssignmentsByPersonId(id);
		log.info("Fin : Récupération des territoires assignés. Nombre trouvé: {}", assignments.size());
		return assignments;
	}
}
