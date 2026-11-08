package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.TerritoryMapVersionDto;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.model.TerritoryMapVersion;
import com.teillet.territoire.repository.TerritoryMapVersionRepository;
import com.teillet.territoire.service.ITerritoryCardHistoryService;
import com.teillet.territoire.service.ITerritoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Cartes précédentes d'un territoire. Elles sont gardées par {@link TerritoryService#storeTerritoryMap} à chaque
 * remplacement ; les remettre passe par lui aussi, la carte actuelle est donc gardée à son tour : rien n'est perdu.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TerritoryCardHistoryService implements ITerritoryCardHistoryService {
	private final TerritoryMapVersionRepository versionRepository;
	private final ITerritoryService territoryService;

	@Override
	@Transactional(readOnly = true)
	public List<TerritoryMapVersionDto> list(UUID territoryId) {
		return versionRepository.findSummaries(territoryId);
	}

	@Override
	@Transactional(readOnly = true)
	public TerritoryMapVersion get(UUID territoryId, UUID versionId) {
		TerritoryMapVersion version = versionRepository.findByIdAndTerritory_Id(versionId, territoryId)
				.orElseThrow(() -> new NotFoundException("Carte précédente introuvable"));
		// Image chargée à la demande : lue ici, tant que la transaction est ouverte
		version.getContent();
		return version;
	}

	@Override
	@Transactional
	public void restore(UUID territoryId, UUID versionId) {
		TerritoryMapVersion version = get(territoryId, versionId);
		territoryService.storeTerritoryMap(territoryId, version.getContent(), version.getFileName(), version.getContentType());
		log.info("Carte précédente {} remise pour le territoire {}", versionId, territoryId);
	}
}
