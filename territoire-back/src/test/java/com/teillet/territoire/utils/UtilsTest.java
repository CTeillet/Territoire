package com.teillet.territoire.utils;

import org.junit.jupiter.api.Test;

import java.awt.*;

import static org.junit.jupiter.api.Assertions.*;

class UtilsTest {

	@Test
	void testCapitalize() {
		assertEquals("", Utils.capitalize(null));
		assertEquals("", Utils.capitalize(""));
		assertEquals("", Utils.capitalize("   "));
		assertEquals("John", Utils.capitalize("john"));
		assertEquals("John", Utils.capitalize("JOHN"));
		assertEquals("John", Utils.capitalize("jOHN"));
	}

	@Test
	void testFormatName() {
		assertEquals("Jean Dupont", Utils.formatName("jean", "dupont"));
		assertEquals("Jean Dupont", Utils.formatName("JEAN", "DUPONT"));
	}

	@Test
	void testParseColor() {
		Color fallback = Color.RED;

		// Invalid cases
		assertEquals(fallback, Utils.parseColor(null, fallback));
		assertEquals(fallback, Utils.parseColor("", fallback));
		assertEquals(fallback, Utils.parseColor("invalid", fallback));
		assertEquals(fallback, Utils.parseColor("#12345", fallback)); // too short
		assertEquals(fallback, Utils.parseColor("#1234567", fallback)); // too long

		// Valid with #
		Color c1 = Utils.parseColor("#FF0000", fallback);
		assertEquals(255, c1.getRed());
		assertEquals(0, c1.getGreen());
		assertEquals(0, c1.getBlue());
		assertEquals(110, c1.getAlpha());

		// Valid without #
		Color c2 = Utils.parseColor("00FF00", fallback);
		assertEquals(0, c2.getRed());
		assertEquals(255, c2.getGreen());
		assertEquals(0, c2.getBlue());
		assertEquals(110, c2.getAlpha());
	}
}
