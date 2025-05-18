package com.teillet.territoire.repository;

import com.teillet.territoire.model.Campaign;
import com.teillet.territoire.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, UUID> {
    List<Campaign> findAllByOrderByStartDateDesc();
    List<Campaign> findByTerritoriesContaining(Territory territory);
    List<Campaign> findByRemainingTerritoriesContaining(Territory territory);
}
