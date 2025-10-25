package com.teillet.territoire.designPattern;

import com.teillet.territoire.dto.exportExcel.CityExportDto;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;

import java.util.List;

public class ExcelGenerator {

	private final Workbook workbook;
	private final int startYear;

	public ExcelGenerator(Workbook workbook, int startYear) {
		this.workbook = workbook;
		this.startYear = startYear;
	}

	public void generate(List<CityExportDto> cities) {
		for (CityExportDto city : cities) {
			Sheet sheet = workbook.createSheet(city.getName());
			new ExcelSheetBuilder(workbook, sheet, startYear)
					.addCityHeader(city)
					.addTerritories(city.getTerritories())
					.setColumnWidth(1, 6000) // Définir la largeur de la colonne 1 à 6000
					.setColumnWidth(2, 6000) // Définir la largeur de la colonne 1 à 6000
					.setColumnWidth(3, 6000) // Définir la largeur de la colonne 1 à 6000
					.setColumnWidth(4, 6000) // Définir la largeur de la colonne 1 à 6000
					.setColumnWidth(5, 6000) // Définir la largeur de la colonne 1 à 6000
					.setColumnWidth(6, 6000) // Définir la largeur de la colonne 1 à 6000
					.setColumnWidth(7, 6000) // Définir la largeur de la colonne 1 à 6000
					.setColumnWidth(8, 6000) // Définir la largeur de la colonne 1 à 6000
					.setColumnWidth(9, 6000) // Définir la largeur de la colonne 1 à 6000
					.build();
		}
	}
}
