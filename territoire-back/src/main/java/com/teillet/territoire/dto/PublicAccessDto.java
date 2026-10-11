package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Données visibles depuis un lien personnel : uniquement les territoires en cours de la personne.
 */
@Data
@Builder
public class PublicAccessDto {
	private String firstName;
	private List<PublicTerritoryDto> territories;

	@Data
	@Builder
	public static class PublicTerritoryDto {
		private UUID id;
		private String name;
		private String cityName;
		private TerritoryType type;
		private String note;
		private LocalDate assignmentDate;
		private LocalDate dueDate;
		private boolean late;
		/** FeatureCollection GeoJSON (pâtés + contour). */
		private String geojson;
		private List<PublicAddressDto> addressesNotToDo;
	}

	@Data
	@Builder
	public static class PublicAddressDto {
		private String number;
		private String street;
		private String zipCode;
		private String city;
	}
}
