package com.teillet.territoire.utils;

import java.time.LocalDate;

public class SchoolYearUtils {

    private SchoolYearUtils() {}

    /**
     * Resolve the start year of the school year (September -> August).
     * If the optional parameter is provided, it is used as-is. Otherwise, it's computed from the current date.
     */
    public static int resolveStartYear(Integer year) {
        if (year != null) {
            return year;
        }
        LocalDate now = LocalDate.now();
        int currentYear = now.getYear();
        return (now.getMonthValue() >= 9) ? currentYear : currentYear - 1;
    }

    public static LocalDate getStartDate(int startYear) {
        return LocalDate.of(startYear, 9, 1);
    }

    public static LocalDate getEndDate(int startYear) {
        return LocalDate.of(startYear + 1, 8, 31);
    }
}
