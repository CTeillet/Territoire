package com.teillet.territoire.controller;

import com.teillet.territoire.dto.CampaignDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import com.teillet.territoire.service.ICampaignService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/campagnes")
@RequiredArgsConstructor
@Slf4j
public class CampaignController {

    private final ICampaignService campaignService;

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException e) {
        log.error("Erreur de validation: {}", e.getMessage());
        return ResponseEntity.badRequest().body(e.getMessage());
    }

    @GetMapping
    public ResponseEntity<List<CampaignDto>> getAllCampaigns() {
        log.info("Requête reçue : GET /api/campagnes");
        List<CampaignDto> campaigns = campaignService.getAllCampaigns();
        log.info("Réponse envoyée : {} campagnes trouvées", campaigns.size());
        return ResponseEntity.ok(campaigns);
    }


    @GetMapping("/{id}")
    public ResponseEntity<CampaignDto> getCampaignById(@PathVariable UUID id) {
        log.info("Requête reçue : GET /api/campagnes/{}", id);
        CampaignDto campaign = campaignService.getCampaignById(id);
        log.info("Réponse envoyée : campagne '{}' trouvée", campaign.getName());
        return ResponseEntity.ok(campaign);
    }

    @PostMapping
    public ResponseEntity<CampaignDto> createCampaign(@RequestBody CampaignDto campaignDto) {
        log.info("Requête reçue : POST /api/campagnes - Création de la campagne '{}'", campaignDto.getName());
        CampaignDto createdCampaign = campaignService.createCampaign(campaignDto);
        log.info("Réponse envoyée : campagne '{}' créée avec succès (ID: {})", createdCampaign.getName(), createdCampaign.getId());
        return new ResponseEntity<>(createdCampaign, HttpStatus.CREATED);
    }

    @PostMapping("/avec-territoires-restants/{previousCampaignId}")
    public ResponseEntity<CampaignDto> createCampaignWithRemainingTerritories(
            @RequestBody CampaignDto campaignDto,
            @PathVariable UUID previousCampaignId) {
        log.info("Requête reçue : POST /api/campagnes/avec-territoires-restants/{} - Création de la campagne '{}' avec territoires restants", 
                previousCampaignId, campaignDto.getName());
        CampaignDto createdCampaign = campaignService.createCampaignWithRemainingTerritories(campaignDto, previousCampaignId);
        log.info("Réponse envoyée : campagne '{}' créée avec succès avec territoires restants (ID: {})", 
                createdCampaign.getName(), createdCampaign.getId());
        return new ResponseEntity<>(createdCampaign, HttpStatus.CREATED);
    }

    @GetMapping("/{id}/territoires-restants")
    public ResponseEntity<List<SimplifiedTerritoryDto>> getRemainingTerritoriesFromCampaign(@PathVariable UUID id) {
        log.info("Requête reçue : GET /api/campagnes/{}/territoires-restants", id);
        List<SimplifiedTerritoryDto> remainingTerritories = campaignService.getRemainingTerritoriesFromCampaign(id);
        log.info("Réponse envoyée : {} territoires restants trouvés", remainingTerritories.size());
        return ResponseEntity.ok(remainingTerritories);
    }


    @PutMapping("/{id}/territoires-restants")
    public ResponseEntity<CampaignDto> updateRemainingTerritories(@PathVariable UUID id, @RequestBody List<SimplifiedTerritoryDto> remainingTerritories) {
        log.info("Requête reçue : PUT /api/campagnes/{}/territoires-restants - {} territoires restants", id, remainingTerritories.size());
        CampaignDto updatedCampaign = campaignService.updateRemainingTerritories(id, remainingTerritories);
        log.info("Réponse envoyée : territoires restants mis à jour pour la campagne '{}'", updatedCampaign.getName());
        return ResponseEntity.ok(updatedCampaign);
    }

    @PutMapping("/{id}/fermer")
    public ResponseEntity<CampaignDto> closeCampaign(@PathVariable UUID id) {
        log.info("Requête reçue : PUT /api/campagnes/{}/fermer", id);
        CampaignDto closedCampaign = campaignService.closeCampaign(id);
        log.info("Réponse envoyée : campagne '{}' clôturée avec succès", closedCampaign.getName());
        return ResponseEntity.ok(closedCampaign);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCampaign(@PathVariable UUID id) {
        log.info("Requête reçue : DELETE /api/campagnes/{}", id);
        campaignService.deleteCampaign(id);
        log.info("Réponse envoyée : campagne supprimée avec succès");
        return ResponseEntity.noContent().build();
    }
}
