package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.teillet.territoire.utils.GeometryDeserializer;
import com.teillet.territoire.utils.GeometrySerializer;
import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Point;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class City implements Comparable<City> {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@Column(nullable = false)
	private String name;

	@Column(name = "zip_code", nullable = false)
	private String zipCode;

	// Hex color code representing the city (e.g., #FF0000)
	@Column(name = "color_hex")
	private String colorHex;

	@JsonSerialize(using = GeometrySerializer.class)
	@JsonDeserialize(using = GeometryDeserializer.class)
	@Column(name = "center", columnDefinition = "geometry(Point, 4326)", nullable = false)
	private Point center;

	@OneToMany(mappedBy = "city", orphanRemoval = true)
	@JsonIgnore
	private List<Territory> territories = new ArrayList<>();

	@Override
	public int compareTo(City o) {
		return this.name.compareTo(o.name);
	}
}
