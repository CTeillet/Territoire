package com.teillet.territoire.controller;

import com.teillet.territoire.model.Person;
import com.teillet.territoire.service.IPersonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/personnes")
@RequiredArgsConstructor
@Slf4j
class PersonController {
	private final IPersonService personService;

	@GetMapping
	public List<Person> getAllPersons() {
		log.info("Début : Récupération des personnes");
		List<Person> allPersons = personService.getAllPersons();
		log.info("Fin : Récupération des personnes");
		return allPersons;
	}

	@PostMapping
	public Person createPerson(@RequestBody Person person) {
		log.info("Début : Création personne : {}", person);
		Person personCreated = personService.createPerson(person);
		log.info("Fin : Création personne");
		return personCreated;
	}

	@DeleteMapping("/{id}")
	public void deletePerson(@PathVariable UUID id) {
		log.info("Début : Suppression personne : {}", id);
		personService.deletePerson(id);
		log.info("Fin : Suppression personne");
	}

	@PutMapping("/{id}")
	public Person modifyPerson(@PathVariable UUID id, @RequestBody Person person) {
		log.info("Début : Modification personne, id {} : {}", id, person);
		Person modifiedPerson = personService.modifyPerson(id, person);
		log.info("Fin : Modification personne");
		return modifiedPerson;
	}
}
