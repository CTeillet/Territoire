package com.teillet.territoire.dto.exportExcel;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentExportDto {
	private String assignmentDate;
	private String returnDate;
	private String assignedToName;
}