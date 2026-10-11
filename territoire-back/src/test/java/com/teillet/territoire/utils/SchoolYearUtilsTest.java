package com.teillet.territoire.utils;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class SchoolYearUtilsTest {

	@Test
	void testResolveStartYear_WithExplicitYear() {
		int result = SchoolYearUtils.resolveStartYear(2023);
		assertEquals(2023, result);
	}

	@Test
	void testResolveStartYear_WithNullYear() {
		int result = SchoolYearUtils.resolveStartYear(null);
		LocalDate now = LocalDate.now();
		int expected = (now.getMonthValue() >= 9) ? now.getYear() : now.getYear() - 1;
		assertEquals(expected, result);
	}

	@Test
	void testGetStartDate() {
		LocalDate startDate = SchoolYearUtils.getStartDate(2024);
		assertEquals(LocalDate.of(2024, 9, 1), startDate);
	}

	@Test
	void testGetEndDate() {
		LocalDate endDate = SchoolYearUtils.getEndDate(2024);
		assertEquals(LocalDate.of(2025, 8, 31), endDate);
	}
}
