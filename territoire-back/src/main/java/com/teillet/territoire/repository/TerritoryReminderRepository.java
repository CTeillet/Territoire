package com.teillet.territoire.repository;

import com.teillet.territoire.model.TerritoryReminder;
import org.springframework.data.jpa.repository.JpaRepository;
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
     * Check if a reminder exists for a specific territory and person
     * @param territoryId the territory ID
     * @param personId the person ID
     * @return true if a reminder exists
     */
    boolean existsByTerritories_IdAndPerson_Id(UUID territoryId, UUID personId);

}