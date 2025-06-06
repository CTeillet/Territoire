package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.CampaignDto;
import com.teillet.territoire.dto.CampaignStatisticsDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.mapper.CampaignMapper;
import com.teillet.territoire.model.Campaign;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.CampaignRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.ICampaignService;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class CampaignService implements ICampaignService {

    private final CampaignRepository campaignRepository;
    private final TerritoryRepository territoryRepository;
    private final IAssignmentService assignmentService;

    public CampaignService(
        CampaignRepository campaignRepository,
        TerritoryRepository territoryRepository,
        @Lazy IAssignmentService assignmentService
    ) {
        this.campaignRepository = campaignRepository;
        this.territoryRepository = territoryRepository;
        this.assignmentService = assignmentService;
    }

    @Override
    public List<CampaignDto> getAllCampaigns() {
        log.info("Récupération de toutes les campagnes");
        List<Campaign> campaigns = campaignRepository.findAllByOrderByStartDateDesc();
        log.info("{} campagnes trouvées", campaigns.size());
        return campaigns.stream()
                .map(CampaignMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public CampaignDto getCampaignById(UUID id) {
        log.info("Récupération de la campagne avec l'ID: {}", id);
        Campaign campaign = getCampaignEntityById(id);
        log.info("Campagne '{}' trouvée", campaign.getName());
        return CampaignMapper.toDto(campaign);
    }

    private Campaign getCampaignEntityById(UUID id) {
        log.debug("Récupération de l'entité campagne avec l'ID: {}", id);
        return campaignRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Campagne non trouvée avec l'ID: {}", id);
                    return new RuntimeException("Campagne non trouvée avec l'ID: " + id);
                });
    }

    /**
     * Helper method to validate campaign dates
     * @param campaignDto The campaign DTO containing dates to validate
     * @return A pair of validated start and end dates
     */
    private LocalDate[] validateCampaignDates(CampaignDto campaignDto) {
        // Validation des dates
        LocalDate startDate;
        if (campaignDto.getStartDate() != null) {
            startDate = campaignDto.getStartDate();
            log.info("Date de début définie: {}", startDate);
        } else {
            startDate = LocalDate.now();
            log.info("Date de début non fournie, utilisation de la date actuelle: {}", startDate);
        }

        if (campaignDto.getEndDate() == null) {
            log.error("La date de fin est obligatoire");
            throw new IllegalArgumentException("La date de fin est obligatoire");
        }

        LocalDate endDate = campaignDto.getEndDate();
        log.info("Date de fin définie: {}", endDate);

        // Vérifier que la date de fin est après la date de début
        if (endDate.isBefore(startDate)) {
            log.error("La date de fin ({}) est avant la date de début ({})", endDate, startDate);
            throw new IllegalArgumentException("La date de fin doit être après la date de début");
        }

        return new LocalDate[]{startDate, endDate};
    }

    /**
     * Helper method to create a campaign entity from DTO and validated dates
     * @param campaignDto The campaign DTO
     * @param startDate The validated start date
     * @param endDate The validated end date
     * @return A new Campaign entity (not yet saved)
     */
    private Campaign createCampaignEntity(CampaignDto campaignDto, LocalDate startDate, LocalDate endDate) {
        Campaign campaign = new Campaign();
        campaign.setName(campaignDto.getName());
        campaign.setDescription(campaignDto.getDescription());
        campaign.setStartDate(startDate);
        campaign.setEndDate(endDate);
        campaign.setClosed(false);
        return campaign;
    }

    @Override
    @Transactional
    public CampaignDto createCampaign(CampaignDto campaignDto) {
        log.info("Création d'une nouvelle campagne: '{}'", campaignDto.getName());

        // Validate dates
        LocalDate[] dates = validateCampaignDates(campaignDto);
        LocalDate startDate = dates[0];
        LocalDate endDate = dates[1];

        // Create campaign entity
        Campaign campaign = createCampaignEntity(campaignDto, startDate, endDate);

        // Get all available territories
        log.info("Récupération de tous les territoires disponibles");
        List<Territory> availableTerritories = territoryRepository.findAll();
        log.info("{} territoires trouvés pour la campagne", availableTerritories.size());
        campaign.setTerritories(new ArrayList<>(availableTerritories));

        Campaign savedCampaign = campaignRepository.save(campaign);
        log.info("Campagne '{}' créée avec succès (ID: {})", savedCampaign.getName(), savedCampaign.getId());
        return CampaignMapper.toDto(savedCampaign);
    }

    @Override
    @Transactional
    public CampaignDto updateRemainingTerritories(UUID id, List<SimplifiedTerritoryDto> remainingTerritoriesDto) {
        log.info("Mise à jour des territoires restants pour la campagne avec l'ID: {}", id);
        Campaign campaign = getCampaignEntityById(id);

        // Convert SimplifiedTerritoryDto to Territory entities
        log.info("Conversion de {} DTOs en entités Territory", remainingTerritoriesDto.size());
        List<Territory> remainingTerritories = new ArrayList<>();
        for (SimplifiedTerritoryDto dto : remainingTerritoriesDto) {
            Territory territory = territoryRepository.findById(dto.getTerritoryId())
                    .orElseThrow(() -> {
                        log.error("Territoire non trouvé avec l'ID: {}", dto.getTerritoryId());
                        return new RuntimeException("Territoire non trouvé avec l'ID: " + dto.getTerritoryId());
                    });
            remainingTerritories.add(territory);
        }

        campaign.setRemainingTerritories(remainingTerritories);

        Campaign updatedCampaign = campaignRepository.save(campaign);
        log.info("{} territoires restants enregistrés pour la campagne '{}'", remainingTerritories.size(), updatedCampaign.getName());
        return CampaignMapper.toDto(updatedCampaign);
    }

    @Override
    @Transactional
    public CampaignDto closeCampaign(UUID id) {
        log.info("Clôture de la campagne avec l'ID: {}", id);
        Campaign campaign = getCampaignEntityById(id);

        if (campaign.isClosed()) {
            log.warn("Tentative de clôture d'une campagne déjà clôturée: {}", campaign.getName());
            throw new RuntimeException("La campagne est déjà clôturée");
        }

        // Set end date and closed status
        campaign.setEndDate(LocalDate.now());
        campaign.setClosed(true);

        // Create assignments for territories that were used during the campaign
        log.info("Calcul des territoires utilisés pendant la campagne");
        List<Territory> usedTerritories = campaign.getTerritories().stream()
                .filter(territory -> !campaign.getRemainingTerritories().contains(territory))
                .toList();

        log.info("{} territoires ont été utilisés pendant la campagne '{}'", usedTerritories.size(), campaign.getName());

        // Save the campaign first to ensure it has an ID
        Campaign closedCampaign = campaignRepository.save(campaign);

        // Create assignments for used territories
        assignmentService.createCampaignAssignments(closedCampaign, usedTerritories);

        log.info("Campagne '{}' clôturée avec succès", closedCampaign.getName());
        return CampaignMapper.toDto(closedCampaign);
    }

    @Override
    @Transactional
    public void deleteCampaign(UUID id) {
        log.info("Suppression de la campagne avec l'ID: {}", id);
        Campaign campaign = getCampaignEntityById(id);

        if (campaign.isClosed()) {
            log.warn("Tentative de suppression d'une campagne clôturée: {}", campaign.getName());
            throw new RuntimeException("Impossible de supprimer une campagne clôturée");
        }

        campaignRepository.delete(campaign);
        log.info("Campagne '{}' supprimée avec succès", campaign.getName());
    }

    @Override
    public List<SimplifiedTerritoryDto> getRemainingTerritoriesFromCampaign(UUID campaignId) {
        log.info("Récupération des territoires restants de la campagne avec l'ID: {}", campaignId);
        Campaign campaign = getCampaignEntityById(campaignId);

        List<Territory> remainingTerritories = campaign.getRemainingTerritories();
        log.info("{} territoires restants trouvés pour la campagne '{}'", remainingTerritories.size(), campaign.getName());

        return remainingTerritories.stream()
                .map(territory -> SimplifiedTerritoryDto.builder()
                        .territoryId(territory.getId())
                        .name(territory.getName())
                        .status(territory.getStatus())
                        .cityId(territory.getCity().getId())
                        .cityName(territory.getCity().getName())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CampaignDto createCampaignWithRemainingTerritories(CampaignDto campaignDto, UUID previousCampaignId) {
        log.info("Création d'une nouvelle campagne '{}' avec les territoires restants de la campagne {}",
                campaignDto.getName(), previousCampaignId);

        // Validate dates
        LocalDate[] dates = validateCampaignDates(campaignDto);
        LocalDate startDate = dates[0];
        LocalDate endDate = dates[1];

        // Récupération de la campagne précédente
        Campaign previousCampaign = getCampaignEntityById(previousCampaignId);
        log.info("Campagne précédente trouvée: '{}'", previousCampaign.getName());

        // Récupération des territoires restants
        List<Territory> remainingTerritories = previousCampaign.getRemainingTerritories();
        log.info("{} territoires restants trouvés dans la campagne précédente", remainingTerritories.size());

        // Create campaign entity
        Campaign campaign = createCampaignEntity(campaignDto, startDate, endDate);

        // Ajout des territoires restants de la campagne précédente
        campaign.setTerritories(new ArrayList<>(remainingTerritories));
        campaign.setRemainingTerritories(new ArrayList<>(remainingTerritories));

        Campaign savedCampaign = campaignRepository.save(campaign);
        log.info("Campagne '{}' créée avec succès avec {} territoires de la campagne précédente (ID: {})",
                savedCampaign.getName(), remainingTerritories.size(), savedCampaign.getId());

        return CampaignMapper.toDto(savedCampaign);
    }
    @Override
    @Transactional
    public void deleteTerrritoryFromAllCampaign(Territory territory) {
        log.info("Suppression du territoire {} des campagnes", territory.getId());

        // Remove from territories list
        List<Campaign> campaignsWithTerritory = campaignRepository.findByTerritoriesContaining(territory);
        for (Campaign campaign : campaignsWithTerritory) {
            campaign.getTerritories().remove(territory);
            campaignRepository.save(campaign);
        }

        // Remove from remainingTerritories list
        List<Campaign> campaignsWithRemainingTerritory = campaignRepository.findByRemainingTerritoriesContaining(territory);
        for (Campaign campaign : campaignsWithRemainingTerritory) {
            campaign.getRemainingTerritories().remove(territory);
            campaignRepository.save(campaign);
        }
    }

    @Override
    @Transactional
    public void deleteTerrritoryFromAllCampaign(UUID territoryId) {
        Territory territory = territoryRepository.findById(territoryId)
                .orElseThrow(() -> new RuntimeException("Territoire non trouvé"));
        deleteTerrritoryFromAllCampaign(territory);
    }

    @Override
    public CampaignStatisticsDto getCampaignStatistics(UUID campaignId) {
        log.info("Récupération des statistiques pour la campagne avec l'ID: {}", campaignId);
        Campaign campaign = getCampaignEntityById(campaignId);

        // Get all territories in the campaign
        List<Territory> allTerritories = campaign.getTerritories();

        // Get remaining territories (available)
        List<Territory> availableTerritories = campaign.getRemainingTerritories();

        // Calculate used territories (all - available)
        List<Territory> usedTerritories = allTerritories.stream()
                .filter(territory -> !availableTerritories.contains(territory))
                .toList();

        // Initialize maps for territory counts by type
        Map<TerritoryType, Integer> totalTerritoriesByType = new HashMap<>();
        Map<TerritoryType, Integer> usedTerritoriesByType = new HashMap<>();
        Map<TerritoryType, Integer> availableTerritoriesByType = new HashMap<>();

        // Initialize counts for each territory type
        for (TerritoryType type : TerritoryType.values()) {
            totalTerritoriesByType.put(type, 0);
            usedTerritoriesByType.put(type, 0);
            availableTerritoriesByType.put(type, 0);
        }

        // Count territories by type
        for (Territory territory : allTerritories) {
            TerritoryType type = territory.getType();
            if (type != null) {
                totalTerritoriesByType.put(type, totalTerritoriesByType.get(type) + 1);
            }
        }

        for (Territory territory : usedTerritories) {
            TerritoryType type = territory.getType();
            if (type != null) {
                usedTerritoriesByType.put(type, usedTerritoriesByType.get(type) + 1);
            }
        }

        for (Territory territory : availableTerritories) {
            TerritoryType type = territory.getType();
            if (type != null) {
                availableTerritoriesByType.put(type, availableTerritoriesByType.get(type) + 1);
            }
        }

        // Build and return the statistics DTO
        CampaignStatisticsDto statisticsDto = CampaignStatisticsDto.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .totalTerritories(allTerritories.size())
                .usedTerritories(usedTerritories.size())
                .availableTerritories(availableTerritories.size())
                .totalTerritoriesByType(totalTerritoriesByType)
                .usedTerritoriesByType(usedTerritoriesByType)
                .availableTerritoriesByType(availableTerritoriesByType)
                .build();

        log.info("Statistiques calculées pour la campagne '{}': {} territoires au total, {} utilisés, {} disponibles",
                campaign.getName(), statisticsDto.getTotalTerritories(), statisticsDto.getUsedTerritories(), 
                statisticsDto.getAvailableTerritories());

        return statisticsDto;
    }
}
