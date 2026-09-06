package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO pour les statistiques de couverture des territoires sur une période (parcourus / non parcourus).
 * Même structure que {@link CampaignStatisticsDto} afin de pouvoir réutiliser les mêmes composants graphiques.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryPeriodStatisticsDto {
    // Total counts
    private int totalTerritories;
    private int usedTerritories;
    private int availableTerritories;

    // Counts by territory type
    private Map<TerritoryType, Integer> totalTerritoriesByType;
    private Map<TerritoryType, Integer> usedTerritoriesByType;
    private Map<TerritoryType, Integer> availableTerritoriesByType;

    // Counts by city name
    private Map<String, Integer> totalTerritoriesByCity;
    private Map<String, Integer> usedTerritoriesByCity;
    private Map<String, Integer> availableTerritoriesByCity;
}
