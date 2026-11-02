package com.teillet.territoire.repository;

import com.teillet.territoire.model.TerritoryReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TerritoryReminderRepository extends JpaRepository<TerritoryReminder, UUID> {
    
    /**
     * Find all reminders for a specific territory
     * @param territoryId the territory ID
     * @return list of reminders for the territory
     */
    List<TerritoryReminder> findByTerritories_Id(UUID territoryId);

    /**
     * Find all reminders for a specific person
     * @param personId the person ID
     * @return list of reminders for the person
     */
    List<TerritoryReminder> findByPerson_Id(UUID personId);
    
    /**
     * Indique si la personne a déjà été relancée pour ce territoire pendant son attribution en cours, c'est-à-dire
     * après le jour où celle-ci a commencé. Un rappel daté de ce jour-là concerne l'attribution précédente : un
     * territoire n'est jamais en retard le jour où il est attribué ou prolongé. Sans attribution en cours, aucun rappel
     * ne compte. Même règle que la dernière relance de {@link TerritoryRepository#findLate()}.
     */
    @Query("""
            SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
            FROM TerritoryReminder r JOIN r.territories t
            JOIN Assignment a ON a.territory = t AND a.returnDate IS NULL
            WHERE t.id = :territoryId AND r.person.id = :personId AND r.reminderDate > a.assignmentDate
            """)
    boolean existsDuringCurrentAssignment(@Param("territoryId") UUID territoryId, @Param("personId") UUID personId);

}