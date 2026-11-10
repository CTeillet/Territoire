package com.teillet.territoire.repository;

import java.util.List;
import com.teillet.territoire.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {

	void deletePersonById(UUID id);

	Optional<Person> findByEmail(String email);

	/** Personnes présentes (non archivées). */
	List<Person> findByArchivedAtIsNull();

	/** Personnes parties, la plus récemment archivée d'abord. */
	List<Person> findByArchivedAtIsNotNullOrderByArchivedAtDesc();
}
