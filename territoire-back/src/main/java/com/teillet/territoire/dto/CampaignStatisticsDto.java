package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

/**
 * DTO for campaign statistics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignStatisticsDto {
    private UUID campaignId;
    private String campaignName;
    
    // Total counts
    private int totalTerritories;
    private int usedTerritories;
    private int availableTerritories;
    
    // Counts by territory type
    private Map<TerritoryType, Integer> totalTerritoriesByType;
    private Map<TerritoryType, Integer> usedTerritoriesByType;
    private Map<TerritoryType, Integer> availableTerritoriesByType;
}