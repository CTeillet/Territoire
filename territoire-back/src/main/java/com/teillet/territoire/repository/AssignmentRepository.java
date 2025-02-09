package com.teillet.territoire.repository;

import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
	List<Assignment> findByDueDateBeforeAndReturnDateIsNull(LocalDate date);
	List<Assignment> findByTerritoryAndReturnDateIsNull(Territory territory);}
