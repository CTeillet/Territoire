package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.TerritoryReminderDto;
import com.teillet.territoire.model.TerritoryReminder;

public class TerritoryReminderMapper {

    /**
     * Convert a TerritoryReminder entity to a TerritoryReminderDto
     * @param reminder the entity to convert
     * @return the converted DTO
     */
    public static TerritoryReminderDto toDto(TerritoryReminder reminder) {
        if (reminder == null) {
            return null;
        }

        return TerritoryReminderDto.builder()
                .id(reminder.getId())
                .territoryId(reminder.getTerritory().getId())
                .territoryName(reminder.getTerritory().getName())
                .personId(reminder.getPerson().getId())
                .personName(reminder.getPerson().getFirstName() + " " + reminder.getPerson().getLastName())
                .remindedById(reminder.getRemindedBy().getId())
                .remindedByName(reminder.getRemindedBy().getFirstName() + " " + reminder.getRemindedBy().getLastName())
                .reminderDate(reminder.getReminderDate())
                .notes(reminder.getNotes())
                .build();
    }
}
