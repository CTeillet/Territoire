package com.teillet.territoire.controller;

import com.teillet.territoire.model.Person;
import com.teillet.territoire.service.PersonService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/persons")
@RequiredArgsConstructor
class PersonController {
	private final PersonService personService;

	@PostMapping
	public Person createPerson(@RequestBody Person person) {
		return personService.createPerson(person);
	}
}
