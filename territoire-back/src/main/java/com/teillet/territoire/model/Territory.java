package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.teillet.territoire.enums.TerritoryStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.proxy.HibernateProxy;
import org.locationtech.jts.geom.Polygon;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Getter
@Setter
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

	private LocalDate lastModifiedDate;

	private String note;

	@OneToMany(mappedBy = "territory", orphanRemoval = true)
	@JsonManagedReference
	private List<Block> blocks = new ArrayList<>();

	@Column(name = "concave_hull", columnDefinition = "geometry(Polygon, 4326)")
	private Polygon concaveHull;

	@OneToMany(mappedBy = "territory", orphanRemoval = true)
	@JsonManagedReference
	List<AddressNotToDo> addressesNotToDo;

	@OneToMany(mappedBy = "territory", orphanRemoval = true)
	@JsonManagedReference
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
