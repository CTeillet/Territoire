package com.teillet.territoire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignDto {
    private UUID id;
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean closed;
    
    @Builder.Default
    private List<SimplifiedTerritoryDto> territories = new ArrayList<>();
    
    @Builder.Default
    private List<SimplifiedTerritoryDto> remainingTerritories = new ArrayList<>();
    
    // We don't include assignments to avoid circular references
    private int assignmentsCount;
}