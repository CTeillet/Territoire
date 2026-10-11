package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.proxy.HibernateProxy;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.MultiPolygon;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Lob;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Territory {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	/**
	 * Verrou optimiste géré par Hibernate : deux modifications simultanées du même territoire (ex. double attribution)
	 * ne passent pas toutes les deux. Valeur par défaut 0 pour que les territoires existants soient remplis à la création de la colonne.
	 */
	@Version
	@Column(nullable = false, columnDefinition = "bigint default 0")
	private Long version;

	private String name;

	@Enumerated(EnumType.STRING)
	private TerritoryStatus status;

	@Enumerated(EnumType.STRING)
	private TerritoryType type;

	private LocalDate lastModifiedDate;

	private String note;

	@OneToMany(mappedBy = "territory", orphanRemoval = true)
	@JsonManagedReference
	@ToString.Exclude
	@Builder.Default
	private List<Block> blocks = new ArrayList<>();

	@Column(name = "concave_hull", columnDefinition = "geometry(MultiPolygon, 4326)")
	private MultiPolygon concaveHull;

	@OneToMany(mappedBy = "territory", orphanRemoval = true)
	@JsonManagedReference
	@ToString.Exclude
	List<AddressNotToDo> addressesNotToDo;

	@OneToMany(mappedBy = "territory", orphanRemoval = true)
	@JsonManagedReference(value = "territory-assignments")
	@ToString.Exclude
	@Builder.Default
	private List<Assignment> assignments = new ArrayList<>();

	@ManyToOne(optional = false)
	@JoinColumn(name = "city_id", nullable = false)
	private City city;

	@Lob
	@Column(name = "territory_map")
	@Basic(fetch = FetchType.LAZY)
	@JdbcTypeCode(SqlTypes.BINARY)
	@ToString.Exclude
	private byte[] territoryMap;

	@Column(name = "territory_map_name")
	private String territoryMapName;

	@Column(name = "territory_map_content_type")
	private String territoryMapContentType;

	@Override
	public final boolean equals(Object o) {
		if (this == o) return true;
		if (o == null) return false;
		Class<?> oEffectiveClass = o instanceof HibernateProxy ? ((HibernateProxy) o).getHibernateLazyInitializer().getPersistentClass() : o.getClass();
		Class<?> thisEffectiveClass = this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass() : this.getClass();
		if (thisEffectiveClass != oEffectiveClass) return false;
		Territory territory = (Territory) o;
		return getId() != null && Objects.equals(getId(), territory.getId());
	}

	@Override
	public final int hashCode() {
		return this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass().hashCode() : getClass().hashCode();
	}
}
