package com.teillet.territoire.service;

import com.teillet.territoire.dto.TerritoryReminderDto;

import java.util.List;
import java.util.UUID;

public interface ITerritoryReminderService {
    
    /**
     * Create a new reminder for a late territory
     * @param territoryIds the territory ID
     * @param personId the person ID (who has the territory)
     * @param notes optional notes about the reminder
     * @return the created reminder DTO
     */
    TerritoryReminderDto createReminder(List<UUID> territoryIds, UUID personId, String notes);

    /**
     * Send a WhatsApp reminder for multiple territories and persist it with the message sent
     * @param territoryIds list of territory IDs
     * @param personId person ID (recipient)
     * @param message message content to send
     * @return the created reminder DTO with messageSend populated and territories list
     */
    TerritoryReminderDto sendWhatsAppReminder(List<UUID> territoryIds, UUID personId, String message);
    
    /**
     * Get all reminders for a specific territory
     * @param territoryId the territory ID
     * @return list of reminders for the territory
     */
    List<TerritoryReminderDto> getRemindersByTerritory(UUID territoryId);
    
    /**
     * Get all reminders for a specific person
     * @param personId the person ID
     * @return list of reminders for the person
     */
    List<TerritoryReminderDto> getRemindersByPerson(UUID personId);
    
    /**
     * Get all reminders
     * @return list of all reminders
     */
    List<TerritoryReminderDto> getAllReminders();
    
    /**
     * Check if a reminder exists for a specific territory and person
     * @param territoryId the territory ID
     * @param personId the person ID
     * @return true if a reminder exists
     */
    boolean hasReminder(UUID territoryId, UUID personId);
}