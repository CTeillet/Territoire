package com.teillet.territoire.utils;

import java.awt.*;

public class Utils {
	private Utils() {}

	public static String formatName(String firstName, String lastName) {
		return "%s %s".formatted(capitalize(firstName), capitalize(lastName));
	}

	public static String capitalize(String str) {
		if (str == null || str.isBlank()) return "";
		return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
	}

	public static Color parseColor(String hex, Color fallback) {
		if (hex == null || !hex.matches("^#?[0-9A-Fa-f]{6}$")) {
			return fallback;
		}
		String clean = hex.startsWith("#") ? hex.substring(1) : hex;
		int r = Integer.parseInt(clean.substring(0, 2), 16);
		int g = Integer.parseInt(clean.substring(2, 4), 16);
		int b = Integer.parseInt(clean.substring(4, 6), 16);
		return new Color(r, g, b, 110); // alpha fixé à 110
	}
}
