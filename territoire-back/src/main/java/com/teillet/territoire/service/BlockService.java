package com.teillet.territoire.service;

import com.teillet.territoire.dto.BlockDto;
import com.teillet.territoire.model.Block;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.BlockRepository;
import com.teillet.territoire.utils.GeoJsonUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Polygon;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BlockService {
	private final ITerritoryService territoryService;
	private final BlockRepository blockRepository;

	@Transactional
	public Block addBlockToTerritory(UUID territoryId, BlockDto blockDTO) {
		log.info("Début : Ajout d'un pâté au territoire");
		log.info("Récupération du territoire");
		Territory territory = territoryService.getTerritory(territoryId);

		log.info("Conversion du GeoJson en Polygon");
		Polygon polygon = GeoJsonUtils.convertGeoJsonToPolygon(blockDTO);

		log.info("Création du pâté");
		Block block = Block.builder()
				.block(polygon)
				.territory(territory)
				.build();

		log.info("Sauvegarde du pâté");
		Block save = blockRepository.save(block);

		log.info("Ajout du pâté au territoire");
		territoryService.updateConcaveHull(territory.getId());

		log.info("Fin : Ajout d'un pâté au territoire");
		return save;
	}

	@Transactional
	public long removeBlockTerritory(UUID territoryId, UUID blockId){
		long res = blockRepository.deleteByIdAndTerritory_Id(blockId, territoryId);
		territoryService.updateConcaveHull(territoryId);
		return res;
	}
}
