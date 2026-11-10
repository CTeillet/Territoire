package com.teillet.territoire.model;

import tools.jackson.databind.annotation.JsonSerialize;
import com.teillet.territoire.security.ContactDetailsSerializer;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Person {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	private String firstName;
	private String lastName;

	// Coordonnées : absentes des logs (toString) et du JSON envoyé à un UTILISATEUR
	@ToString.Exclude
	@JsonSerialize(using = ContactDetailsSerializer.class)
	private String phoneNumber;

	@ToString.Exclude
	@JsonSerialize(using = ContactDetailsSerializer.class)
	private String email;

	/**
	 * Personne partie (déménagement...) : absente des listes et des choix d'attribution, son historique reste. Remplace
	 * la suppression, refusée pour une personne qui a un historique.
	 */
	private java.time.Instant archivedAt;

	/** Nom remplacé et coordonnées effacées (après archivage) : l'historique reste compté, sans la nommer. */
	private java.time.Instant anonymizedAt;
}
