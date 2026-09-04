package com.teillet.territoire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolYearPeriodDto {
    private int startYear;
    private int endYear;
    private String label;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean current;
}
