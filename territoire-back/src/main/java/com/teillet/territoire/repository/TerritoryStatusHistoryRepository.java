package com.teillet.territoire.repository;

import com.teillet.territoire.model.TerritoryStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TerritoryStatusHistoryRepository extends JpaRepository<TerritoryStatusHistory, UUID> {
}
