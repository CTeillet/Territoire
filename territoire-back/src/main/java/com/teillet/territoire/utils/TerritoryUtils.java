package com.teillet.territoire.utils;

import com.teillet.territoire.model.Territory;

public class TerritoryUtils {

	public static final String NOUVEAU = "nouveau";

	public static String getLastVisitedOn(Territory territory) {
		return territory.getAssignments()
				.stream()
				.filter(assignment -> assignment.getReturnDate() != null)
				.map(assignment -> assignment.getReturnDate().toString())
				.findFirst()
				.orElse(NOUVEAU);
	}
}
