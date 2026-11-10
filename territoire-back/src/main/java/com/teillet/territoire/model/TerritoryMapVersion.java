package com.teillet.territoire.model;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Carte d'un territoire remplacée par une autre (carte physique générée, carte importée, carte précédente remise) :
 * gardée pour pouvoir la revoir ou la remettre.
 */
@Entity
@Table(name = "territory_map_version")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TerritoryMapVersion {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "territory_id", nullable = false)
	private Territory territory;

	/**
	 * Image, chargée seulement quand on l'affiche ou qu'on la remet (enhancement Hibernate, cf. pom.xml). bytea, de
	 * longueur variable : H2 (tests) le comprend aussi, sans compléter l'image par des zéros.
	 */
	@Basic(fetch = FetchType.LAZY)
	@JdbcTypeCode(SqlTypes.VARBINARY)
	@Column(name = "content", nullable = false, columnDefinition = "bytea")
	private byte[] content;

	@Column(name = "file_name")
	private String fileName;

	@Column(name = "content_type")
	private String contentType;

	/** Moment où cette carte a cessé d'être la carte du territoire. */
	@Column(name = "replaced_at", nullable = false)
	private Instant replacedAt;
}
