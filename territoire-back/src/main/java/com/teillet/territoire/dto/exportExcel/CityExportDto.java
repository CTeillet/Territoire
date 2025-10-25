package com.teillet.territoire.dto.exportExcel;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CityExportDto {
	private String name;
	private List<TerritoryExportDto> territories;
}
