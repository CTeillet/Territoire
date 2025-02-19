package com.teillet.territoire.repository;

import com.teillet.territoire.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TerritoryRepository extends JpaRepository<Territory, Long> {
	Territory getTerritoriesById(UUID id);
}
