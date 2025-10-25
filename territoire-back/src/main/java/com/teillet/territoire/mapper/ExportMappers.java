package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.exportExcel.AssignmentExportDto;
import com.teillet.territoire.dto.exportExcel.CityExportDto;
import com.teillet.territoire.dto.exportExcel.TerritoryExportDto;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.utils.TerritoryUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public class ExportMappers {
	public static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	private ExportMappers() {}

	/* ===========================
	 *  Public entry points
	 * =========================== */

	/** Mappe une liste de villes vers des DTO d’export (triées par nom). */
	public static List<CityExportDto> toExportDtos(List<City> cities, LocalDate start, LocalDate end) {
		return cities == null ? List.of() : cities.stream()
				.filter(Objects::nonNull)
				.map(c -> toExportDto(c, start, end))
				.sorted(Comparator.comparing(CityExportDto::getName))
				.collect(Collectors.toList());
	}

	/** Mappe une ville complète (terrains filtrés/triés et assignations filtrées/triées). */
	public static CityExportDto toExportDto(City city, LocalDate start, LocalDate end) {
		if (city == null) return null;

		List<TerritoryExportDto> territories = city.getTerritories() == null ? List.of() :
				city.getTerritories().stream()
						.filter(Objects::nonNull)
						.map(t -> toExportDto(t, start, end))
						.sorted(Comparator.comparing(TerritoryExportDto::getName))
						.collect(Collectors.toList());

		CityExportDto dto = new CityExportDto();
		dto.setName(city.getName());
		dto.setTerritories(territories);
		return dto;
	}

	/** Mappe un terrain (assignations filtrées/triées + lastReturnedOn globale). */
	public static TerritoryExportDto toExportDto(Territory t, LocalDate start, LocalDate end) {
		if (t == null) return null;

		List<AssignmentExportDto> filtered = t.getAssignments() == null ? List.of() :
				t.getAssignments().stream()
						.filter(a -> assignmentOverlapsSchoolYear(a, start, end))
						.sorted(Comparator.comparing(Assignment::getAssignmentDate))
						.map(ExportMappers::toExportDto)
						.collect(Collectors.toList());

		TerritoryExportDto dto = new TerritoryExportDto();
		dto.setName(t.getName());
		dto.setAssignments(filtered);
		dto.setLastReturnedOn(TerritoryUtils.getLastVisitedOn(t));
		return dto;
	}

	/** Mappe une assignation (dates → String, nom complet de la personne). */
	public static AssignmentExportDto toExportDto(Assignment a) {
		if (a == null) return null;

		AssignmentExportDto dto = new AssignmentExportDto();
		dto.setAssignmentDate(formatDate(a.getAssignmentDate()));
		dto.setReturnDate(formatDate(a.getReturnDate()));
		dto.setAssignedToName(getPersonName(a));
		return dto;
	}

	/* ===========================
	 *  Helpers
	 * =========================== */

	private static String formatDate(LocalDate date) {
		return date != null ? date.format(DATE_FORMATTER) : "";
	}

	private static String getPersonName(Assignment assignment) {
		if (assignment.getPerson() != null) {
			return assignment.getPerson().getFirstName() + " " + assignment.getPerson().getLastName();
		} else if(assignment.getCampaign() != null) {
			return "-- " + assignment.getCampaign().getName() + " --";
		}
		return "";
	}

	public static boolean assignmentOverlapsSchoolYear(Assignment a, LocalDate start, LocalDate end) {
		LocalDate assignmentDate = a.getAssignmentDate();
		if (assignmentDate == null) {
			return false;
		}
		LocalDate returnDate = a.getReturnDate();
		if (returnDate != null) {
			// Overlap if [assignmentDate, returnDate] intersects [start, end]
			return !returnDate.isBefore(start) && !assignmentDate.isAfter(end);
		} else {
			// Ongoing: include if it started on/before the end of the window
			return !assignmentDate.isAfter(end);
		}
	}

}