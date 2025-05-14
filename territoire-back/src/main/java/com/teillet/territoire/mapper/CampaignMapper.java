package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.CampaignDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import com.teillet.territoire.model.Campaign;

import java.util.stream.Collectors;

public class CampaignMapper {

    public static CampaignDto toDto(Campaign campaign) {
        CampaignDto dto = CampaignDto.builder()
                .id(campaign.getId())
                .name(campaign.getName())
                .description(campaign.getDescription())
                .startDate(campaign.getStartDate())
                .endDate(campaign.getEndDate())
                .closed(campaign.isClosed())
                .assignmentsCount(campaign.getAssignments() != null ? campaign.getAssignments().size() : 0)
                .build();

        // Convert territories to SimplifiedTerritoryDto
        if (campaign.getTerritories() != null) {
            dto.setTerritories(campaign.getTerritories().stream()
                    .map(territory -> SimplifiedTerritoryDto.builder()
                            .territoryId(territory.getId())
                            .name(territory.getName())
                            .status(territory.getStatus())
                            .cityId(territory.getCity().getId())
                            .cityName(territory.getCity().getName())
                            .build())
                    .collect(Collectors.toList()));
        }

        // Convert remaining territories to SimplifiedTerritoryDto
        if (campaign.getRemainingTerritories() != null) {
            dto.setRemainingTerritories(campaign.getRemainingTerritories().stream()
                    .map(territory -> SimplifiedTerritoryDto.builder()
                            .territoryId(territory.getId())
                            .name(territory.getName())
                            .status(territory.getStatus())
                            .cityId(territory.getCity().getId())
                            .cityName(territory.getCity().getName())
                            .build())
                    .collect(Collectors.toList()));
        }

        return dto;
    }

}
