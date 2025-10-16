package com.teillet.territoire.repository;

import com.teillet.territoire.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {

	void deletePersonById(UUID id);

	Optional<Person> findByEmail(String email);
}
