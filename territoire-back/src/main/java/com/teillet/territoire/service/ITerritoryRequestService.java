package com.teillet.territoire.service;

import com.teillet.territoire.dto.AvailableTerritoryDto;
import com.teillet.territoire.dto.CreateTerritoryRequestDto;
import com.teillet.territoire.dto.PublicAccessDto;
import com.teillet.territoire.dto.TerritoryRequestDto;
import com.teillet.territoire.model.Person;

import java.util.List;
import java.util.UUID;

/**
 * Demandes de nouveau territoire faites par les personnes depuis leur lien personnel.
 */
public interface ITerritoryRequestService {
	/** Demandes en attente (les plus anciennes d'abord), suivies de l'historique si demandé (les plus récentes d'abord). */
	List<TerritoryRequestDto> getRequests(boolean includeClosed);

	long countPending();

	/**
	 * Clôture une demande sans attribution.
	 *
	 * @throws IllegalStateException si la demande n'est plus en attente
	 */
	TerritoryRequestDto close(UUID requestId);

	/** Territoires disponibles dans la ville demandée (toutes les villes sans préférence), les moins récemment parcourus d'abord. */
	List<AvailableTerritoryDto> getAvailableTerritories(UUID requestId);

	/** Clôture les demandes en attente de la personne lorsqu'un territoire lui est attribué. */
	void markAssigned(UUID personId, UUID territoryId);

	/**
	 * Message WhatsApp au responsable (si un numéro est configuré). Ne lève pas d'exception : un échec d'envoi ne doit
	 * pas remettre en cause la demande.
	 */
	void notifyNewRequest(UUID requestId);

	// ---------------------------------------------------------------- Depuis le lien personnel (personne déjà authentifiée)

	List<PublicAccessDto.PublicCityDto> getRequestableCities();

	PublicAccessDto.PublicTerritoryRequestDto getPendingRequest(UUID personId);

	/**
	 * @throws IllegalStateException    si une demande est déjà en attente ou si trop de demandes ont été faites
	 * @throws IllegalArgumentException si la ville est inconnue
	 */
	void create(Person person, CreateTerritoryRequestDto request);

	/**
	 * @throws com.teillet.territoire.exception.NotFoundException si la demande n'appartient pas à la personne
	 * @throws IllegalStateException                              si la demande n'est plus en attente
	 */
	void cancel(UUID personId, UUID requestId);
}
