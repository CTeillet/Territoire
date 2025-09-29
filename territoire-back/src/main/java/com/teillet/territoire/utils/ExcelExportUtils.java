package com.teillet.territoire.utils;

import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class ExcelExportUtils {

	private ExcelExportUtils() {}

	/**
	 * Prepare cities for export by filtering assignments to those that overlap the given school year window
	 * and sorting territories and cities by name. The returned list is a new list with mapped entities
	 * (assignments lists are replaced by filtered lists).
	 */
	public static List<City> prepareCitiesForExport(List<City> cities, LocalDate start, LocalDate end) {
		return cities.stream().map(city -> {
			List<Territory> territories = city.getTerritories();
			territories = territories.stream()
				.map(t -> {
					List<Assignment> filtered = t.getAssignments().stream()
						.filter(a -> assignmentOverlapsSchoolYear(a, start, end))
						.sorted(Comparator.comparing(Assignment::getAssignmentDate))
						.toList();
					t.setAssignments(filtered);
					return t;
				})
				.sorted(Comparator.comparing(Territory::getName))
				.toList();
			city.setTerritories(territories);
			return city;
		}).sorted(Comparator.comparing(City::getName)).collect(Collectors.toList());
	}

	private static boolean assignmentOverlapsSchoolYear(Assignment a, LocalDate start, LocalDate end) {
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
