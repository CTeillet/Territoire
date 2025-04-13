package com.teillet.territoire.utils;

import com.teillet.territoire.model.Territory;

public class TerritoryUtils {

	public static final String NOUVEAU = "nouveau";
	public static final String NA = "N/A";

	public static String getLastVisitedOn(Territory territory) {
		return territory.getAssignments()
				.stream()
				.filter(assignment -> assignment.getReturnDate() != null)
				.map(assignment -> assignment.getReturnDate().toString())
				.findFirst()
				.orElse(NOUVEAU);
	}

	public static String getAssignedTo(Territory territory) {
		return territory.getAssignments()
				.stream()
				.filter(assignment -> assignment.getReturnDate() != null)
				.map(assignment -> assignment.getPerson().getFirstName() + " " + assignment.getPerson().getLastName())
				.findFirst()
				.orElse(NA);
	}

	public static String getAssignedOn(Territory territory) {
		return territory.getAssignments()
				.stream()
				.filter(assignment -> assignment.getReturnDate() != null)
				.map(assignment -> assignment.getAssignmentDate().toString())
				.findFirst()
				.orElse(NA);
	}

	public static String getWaitedFor(Territory territory) {
		return territory.getAssignments()
				.stream()
				.filter(assignment -> assignment.getReturnDate() != null)
				.map(assignment -> assignment.getDueDate().toString())
				.findFirst()
				.orElse(NA);
	}
}
