package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Polygon;

import java.util.UUID;

@Entity
@Getter
@Setter
@ToString
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
	@JsonBackReference
	private Territory territory;

}
