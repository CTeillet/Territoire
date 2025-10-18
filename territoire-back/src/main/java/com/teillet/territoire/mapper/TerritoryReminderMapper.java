package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.TerritoryReminderDto;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.model.TerritoryReminder;

import java.util.List;
import java.util.stream.Collectors;

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

        TerritoryReminderDto.TerritoryReminderDtoBuilder builder = TerritoryReminderDto.builder()
                .id(reminder.getId())
                .personId(reminder.getPerson() != null ? reminder.getPerson().getId() : null)
                .personName(reminder.getPerson() != null ? (reminder.getPerson().getFirstName() + " " + reminder.getPerson().getLastName()) : null)
                .reminderDate(reminder.getReminderDate())
                .notes(reminder.getNotes())
                .messageSend(reminder.getMessageSend());

        List<Territory> territories = reminder.getTerritories();
        if (territories != null && !territories.isEmpty()) {
            builder.territoryIds(territories.stream().map(Territory::getId).collect(Collectors.toList()))
                   .territoryNames(territories.stream().map(Territory::getName).collect(Collectors.toList()));
        }

        return builder.build();
    }
}
