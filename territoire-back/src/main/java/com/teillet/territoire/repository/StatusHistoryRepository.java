package com.teillet.territoire.repository;

import com.teillet.territoire.model.StatusHistory;
import com.teillet.territoire.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StatusHistoryRepository extends JpaRepository<StatusHistory, UUID> {
	List<StatusHistory> findByTerritory(Territory territory);
}
