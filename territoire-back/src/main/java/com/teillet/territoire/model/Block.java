package com.teillet.territoire.model;

import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Polygon;

import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Block {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@Column(name = "block", columnDefinition = "geometry(Polygon, 4326)")
	private Polygon block;

	@ManyToOne
	@JoinColumn(name = "territory_id")
	private Territory territory;

}
