package com.teillet.territoire.service;

import com.teillet.territoire.dto.CampaignDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

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
}
