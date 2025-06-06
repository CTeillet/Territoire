package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.proxy.HibernateProxy;
import org.locationtech.jts.geom.MultiPolygon;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

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
	private List<Assignment> assignments = new ArrayList<>();

	@ManyToOne(optional = false)
	@JoinColumn(name = "city_id", nullable = false)
	private City city;

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
