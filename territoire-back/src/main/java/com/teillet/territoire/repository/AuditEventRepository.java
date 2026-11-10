package com.teillet.territoire.repository;

import com.teillet.territoire.model.AuditEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

	List<AuditEvent> findAllByOrderByOccurredAtDesc(Pageable page);

	List<AuditEvent> findByTerritoryIdOrderByOccurredAtDesc(UUID territoryId, Pageable page);

	List<AuditEvent> findByPersonIdOrderByOccurredAtDesc(UUID personId, Pageable page);

	/** Personne anonymisée : son nom disparaît aussi du journal. */
	@Modifying
	@Query("update AuditEvent e set e.personName = :name where e.personId = :personId")
	int renamePerson(@Param("personId") UUID personId, @Param("name") String name);
}
