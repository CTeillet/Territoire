package com.teillet.territoire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryReminderDto {
    private UUID id;
    private UUID territoryId;
    private String territoryName;
    private UUID personId;
    private String personName;
    private LocalDate reminderDate;
    private String notes;
    private String messageSend;
}