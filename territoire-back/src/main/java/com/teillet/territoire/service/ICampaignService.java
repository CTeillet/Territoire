package com.teillet.territoire.service;

import com.teillet.territoire.dto.CampaignDto;
import com.teillet.territoire.dto.CampaignStatisticsDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import com.teillet.territoire.model.Territory;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service for managing campaigns
 */
public interface ICampaignService {

    List<CampaignDto> getAllCampaigns();

    CampaignDto getCampaignById(UUID id);

    @Transactional
    CampaignDto createCampaign(CampaignDto campaignDto);

    @Transactional
    CampaignDto createCampaignWithRemainingTerritories(CampaignDto campaignDto, UUID previousCampaignId);

    List<SimplifiedTerritoryDto> getRemainingTerritoriesFromCampaign(UUID campaignId);

    @Transactional
    CampaignDto updateRemainingTerritories(UUID id, List<SimplifiedTerritoryDto> remainingTerritories);

    @Transactional
    CampaignDto closeCampaign(UUID id);

    @Transactional
    void deleteCampaign(UUID id);

    /**
     * Removes a territory from all campaigns
     * @param territory The territory to remove from all campaigns
     */
    void deleteTerrritoryFromAllCampaign(Territory territory);

    /**
     * Removes a territory from all campaigns by its ID
     * @param territoryId The ID of the territory to remove from all campaigns
     */
    void deleteTerrritoryFromAllCampaign(UUID territoryId);

    /**
     * Get statistics for a campaign
     * @param campaignId The ID of the campaign
     * @return Statistics for the campaign
     */
    CampaignStatisticsDto getCampaignStatistics(UUID campaignId);
}
