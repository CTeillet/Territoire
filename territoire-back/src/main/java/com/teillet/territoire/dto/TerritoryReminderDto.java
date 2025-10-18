package com.teillet.territoire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryReminderDto {
    private UUID id;

    // Single territory (legacy)
    private UUID territoryId;
    private String territoryName;

    // Multiple territories (new)
    private List<UUID> territoryIds;
    private List<String> territoryNames;

    private UUID personId;
    private String personName;
    private LocalDate reminderDate;
    private String notes;
    private String messageSend;
}