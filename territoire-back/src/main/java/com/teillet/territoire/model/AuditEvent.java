package com.teillet.territoire.model;

import com.teillet.territoire.enums.AuditAction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Ligne du journal des actions. Territoire et personne sont gardés par identifiant et par nom, sans lien : la ligne
 * reste lisible quand ils disparaissent.
 */
@Entity
@Table(name = "audit_event")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEvent {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@Column(name = "occurred_at", nullable = false)
	private Instant occurredAt;

	/** E-mail de l'utilisateur connecté, ou « Lien personnel » pour une action faite depuis /m/... */
	@Column(nullable = false)
	private String actor;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 64)
	private AuditAction action;

	@Column(name = "territory_id")
	private UUID territoryId;

	@Column(name = "territory_name")
	private String territoryName;

	@Column(name = "person_id")
	private UUID personId;

	@Column(name = "person_name")
	private String personName;

	@Column(columnDefinition = "TEXT")
	private String details;
}
