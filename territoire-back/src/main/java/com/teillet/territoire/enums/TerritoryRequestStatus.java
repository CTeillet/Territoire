package com.teillet.territoire.enums;

/**
 * État d'une demande de nouveau territoire faite depuis un lien personnel.
 */
public enum TerritoryRequestStatus {
	EN_ATTENTE,
	/** Un territoire a été attribué à la personne depuis sa demande. */
	ATTRIBUEE,
	/** Clôturée par un responsable sans attribution. */
	CLOTUREE,
	/** Annulée par la personne elle-même. */
	ANNULEE
}
