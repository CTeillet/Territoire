package com.teillet.territoire.repository;

import com.teillet.territoire.model.PersonAccess;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PersonAccessRepository extends JpaRepository<PersonAccess, UUID> {
	Optional<PersonAccess> findByPerson_Id(UUID personId);

	void deleteByPerson_Id(UUID personId);
}
