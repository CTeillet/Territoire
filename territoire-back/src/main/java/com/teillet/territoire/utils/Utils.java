package com.teillet.territoire.utils;

public class Utils {
	private Utils() {}

	public static String formatName(String firstName, String lastName) {
		return "%s %s".formatted(capitalize(firstName), capitalize(lastName));
	}

	public static String capitalize(String str) {
		if (str == null || str.isBlank()) return "";
		return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
	}
}
