package com.teillet.territoire.controller;

import com.teillet.territoire.model.Person;
import com.teillet.territoire.service.PersonService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/personnes")
@RequiredArgsConstructor
class PersonController {
	private final PersonService personService;

	@GetMapping
	public List<Person> getAllPersons() {
		return personService.getAllPersons();
	}

	@PostMapping
	public Person createPerson(@RequestBody Person person) {
		return personService.createPerson(person);
	}

	@DeleteMapping("/{id}")
	public void deletePerson(@PathVariable UUID id) {
		personService.deletePerson(id);
	}

	@PutMapping("/{id}")
	public Person modifyPerson(@PathVariable UUID id, @RequestBody Person person) {
		return personService.modifyPerson(id, person);
	}
}
