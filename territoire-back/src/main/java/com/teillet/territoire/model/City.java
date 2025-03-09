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
public class City {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@Column(nullable = false)
	private String name;

	@Column(name = "zip_code")
	private String zipCode;

	@JsonSerialize(using = GeometrySerializer.class)
	@JsonDeserialize(using = GeometryDeserializer.class)
	@Column(name = "center", columnDefinition = "geometry(Point, 4326)")
	private Point center;

	@OneToMany(mappedBy = "city", orphanRemoval = true)
	@JsonIgnore
	private List<Territory> territories = new ArrayList<>();
}
