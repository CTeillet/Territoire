package com.teillet.territoire.repository;

import com.teillet.territoire.model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
	List<Assignment> findByDueDateBeforeAndReturnDateIsNull(LocalDate date);

	Optional<Assignment> findByReturnDateNullAndTerritory_Id(UUID id);
}
