package com.teillet.territoire.dto.exportExcel;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryExportDto {
	private String name;
	private List<AssignmentExportDto> assignments; // filtrées sur l'année scolaire
	private String lastReturnedOn;              // globale (hors filtre)
}