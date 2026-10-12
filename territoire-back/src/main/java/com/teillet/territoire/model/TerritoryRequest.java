package com.teillet.territoire.model;

import com.teillet.territoire.enums.TerritoryRequestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

/**
 * Demande de nouveau territoire faite par une personne depuis son lien personnel.
 * <p>
 * Les clés étrangères sont gérées par la base (ON DELETE) : supprimer une personne supprime ses demandes, supprimer
 * une ville ou un territoire conserve la demande sans la référence.
 */
@Entity
@Table(name = "territory_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TerritoryRequest {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@ManyToOne(optional = false)
	@JoinColumn(name = "person_id", nullable = false)
	@OnDelete(action = OnDeleteAction.CASCADE)
	private Person person;

	/** Ville souhaitée ; null = pas de préférence. */
	@ManyToOne
	@JoinColumn(name = "city_id")
	@OnDelete(action = OnDeleteAction.SET_NULL)
	private City city;

	@Column(columnDefinition = "TEXT")
	private String comment;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private TerritoryRequestStatus status;

	@Column(nullable = false)
	private Instant createdAt;

	private Instant closedAt;

	/** Territoire attribué en réponse à la demande (LAZY : le territoire complet embarque sa carte). */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "territory_id")
	@OnDelete(action = OnDeleteAction.SET_NULL)
	private Territory territory;
}
