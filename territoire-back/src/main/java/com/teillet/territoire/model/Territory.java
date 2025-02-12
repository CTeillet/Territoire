package com.teillet.territoire.model;

import com.teillet.territoire.enums.TerritoryStatus;
import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Polygon;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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

	private String city;

	@ElementCollection
	@Column(name = "block", columnDefinition = "geometry(Polygon, 4326)")
	@CollectionTable(name = "territory_polygon", joinColumns = @JoinColumn(name = "owner_id"))
	private List<Polygon> blocks = new ArrayList<>();

	@Column(name = "concave_hull", columnDefinition = "geometry(Polygon, 4326)")
	private Polygon concaveHull;

	@OneToMany(mappedBy = "territory", orphanRemoval = true)
	List<Address> addressNotToDo;
}
