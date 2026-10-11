package com.teillet.territoire.service;

import com.teillet.territoire.dto.PersonAccessStatusDto;
import com.teillet.territoire.dto.PublicAccessDto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Liens personnels permettant à une personne de consulter et rendre ses territoires en cours.
 */
public interface IPersonAccessService {
	List<PersonAccessStatusDto> getAllStatuses();

	PersonAccessStatusDto getStatus(UUID personId);

	/** Crée le lien s'il n'existe pas, sinon en génère un nouveau (l'ancien cesse de fonctionner). */
	PersonAccessStatusDto regenerate(UUID personId);

	/** Coupe l'accès : l'ancien lien cesse de fonctionner et aucun nouveau n'est créé. */
	PersonAccessStatusDto revoke(UUID personId);

	PersonAccessStatusDto updateExpiration(UUID personId, LocalDate expiresAt);

	/**
	 * Envoie le lien par WhatsApp (le crée s'il n'existe pas encore).
	 *
	 * @throws IllegalStateException si la personne n'a pas de numéro ou si l'accès est révoqué ou expiré
	 */
	PersonAccessStatusDto sendLink(UUID personId);

	/**
	 * Message WhatsApp envoyé après une attribution (si activé dans les réglages). Ne lève pas d'exception :
	 * un échec d'envoi ne doit pas remettre en cause l'attribution.
	 */
	void notifyAssignment(UUID assignmentId);

	/**
	 * @throws com.teillet.territoire.exception.NotFoundException si le lien est invalide, révoqué ou expiré
	 */
	PublicAccessDto getPublicView(String token);

	/** Retour d'un territoire par la personne elle-même. */
	PublicAccessDto returnTerritory(String token, UUID territoryId);

	void deleteForPerson(UUID personId);
}
