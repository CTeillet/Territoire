package com.teillet.territoire.repository;

import com.teillet.territoire.enums.TerritoryRequestStatus;
import com.teillet.territoire.model.TerritoryRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TerritoryRequestRepository extends JpaRepository<TerritoryRequest, UUID> {
	Optional<TerritoryRequest> findFirstByPerson_IdAndStatus(UUID personId, TerritoryRequestStatus status);

	List<TerritoryRequest> findByPerson_IdAndStatus(UUID personId, TerritoryRequestStatus status);

	List<TerritoryRequest> findByStatusOrderByCreatedAtAsc(TerritoryRequestStatus status);

	List<TerritoryRequest> findAllByOrderByCreatedAtDesc();

	long countByStatus(TerritoryRequestStatus status);

	long countByPerson_IdAndCreatedAtAfter(UUID personId, Instant after);
}
