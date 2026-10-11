package com.teillet.territoire.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Accès numérique d'une personne à ses territoires en cours, via un lien personnel.
 * <p>
 * Le jeton du lien n'est pas stocké : il est recalculé à partir de l'identifiant de la personne, de {@link #version}
 * et d'un secret serveur (cf. {@code AccessLinkTokens}). Incrémenter la version invalide immédiatement l'ancien lien.
 */
@Entity
@Table(name = "person_access")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonAccess {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@OneToOne(optional = false)
	@JoinColumn(name = "person_id", nullable = false, unique = true)
	private Person person;

	@Column(nullable = false)
	private int version;

	@Column(nullable = false)
	private boolean revoked;

	/** Date de fin d'accès (incluse), facultative. */
	private LocalDate expiresAt;

	@Column(nullable = false)
	private Instant createdAt;

	private Instant lastUsedAt;

	private Instant lastSentAt;
}
