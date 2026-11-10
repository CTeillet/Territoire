package com.teillet.territoire.service;

import com.teillet.territoire.dto.TerritoryMapVersionDto;
import com.teillet.territoire.model.TerritoryMapVersion;

import java.util.List;
import java.util.UUID;

/** Cartes précédentes d'un territoire : liste, image, remise en place. */
public interface ITerritoryCardHistoryService {
	List<TerritoryMapVersionDto> list(UUID territoryId);

	/** Carte précédente avec son image chargée. */
	TerritoryMapVersion get(UUID territoryId, UUID versionId);

	/** Remet cette carte : la carte actuelle rejoint à son tour les cartes précédentes. */
	void restore(UUID territoryId, UUID versionId);
}
