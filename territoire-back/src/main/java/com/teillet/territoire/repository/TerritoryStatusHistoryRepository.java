package com.teillet.territoire.repository;

import com.teillet.territoire.model.TerritoryStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TerritoryStatusHistoryRepository extends JpaRepository<TerritoryStatusHistory, UUID> {

    @Query("SELECT h FROM TerritoryStatusHistory h WHERE (CAST(:startDate AS date) IS NULL OR h.date >= CAST(:startDate AS date)) AND (CAST(:endDate AS date) IS NULL OR h.date <= CAST(:endDate AS date)) ORDER BY h.date ASC")
    List<TerritoryStatusHistory> findByDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
