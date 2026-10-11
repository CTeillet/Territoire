package com.teillet.territoire.repository;

import com.teillet.territoire.model.TerritoryStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TerritoryStatusHistoryRepository extends JpaRepository<TerritoryStatusHistory, UUID> {

    Optional<TerritoryStatusHistory> findFirstByDate(LocalDate date);

    @Query("SELECT h FROM TerritoryStatusHistory h WHERE (:hasStart = false OR h.date >= :startDate) AND (:hasEnd = false OR h.date <= :endDate) ORDER BY h.date ASC")
    List<TerritoryStatusHistory> findByDateBetweenQuery(@Param("hasStart") boolean hasStart, @Param("startDate") LocalDate startDate,
                                                        @Param("hasEnd") boolean hasEnd, @Param("endDate") LocalDate endDate);

    default List<TerritoryStatusHistory> findByDateBetween(LocalDate startDate, LocalDate endDate) {
        return findByDateBetweenQuery(startDate != null, OptionalDates.startOrMin(startDate), endDate != null, OptionalDates.endOrMax(endDate));
    }
}
