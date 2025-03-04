package com.teillet.territoire.service.impl;

import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.IExcelExportService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ExcelExportService implements IExcelExportService {

	@Override
	public void generateExcel(List<City> cities, ByteArrayOutputStream outputStream) throws IOException {
		Workbook workbook = new XSSFWorkbook();
		DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

		// Définition des styles
		CellStyle headerStyle = createHeaderStyle(workbook);
		CellStyle subHeaderStyle = createSubHeaderStyle(workbook);
		CellStyle centeredStyle = createCenteredStyle(workbook);
		CellStyle blueFillStyle = createBlueRowStyle(workbook);

		for (City city : cities) {
			Sheet sheet = workbook.createSheet(city.getName());
			int rowNum = 0;

			// ---- Titre de la ville ----
			Row cityRow = sheet.createRow(rowNum++);
			cityRow.setHeightInPoints(30);
			Cell cityCell = cityRow.createCell(0);
			cityCell.setCellValue(city.getName());
			cityCell.setCellStyle(headerStyle);
			sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 9));

			// ---- En-tête ----
			createHeaderRow(sheet, rowNum, subHeaderStyle);

			rowNum += 2; // Ligne où les territoires commencent

			// ---- Remplissage des territoires ----
			boolean isBlue = false;
			for (Territory territory : city.getTerritories()) {
//				int startRow = rowNum;
				Row territoryRow = sheet.createRow(rowNum++);
				Row dateRow = sheet.createRow(rowNum++);

				// Alternance des couleurs corrigée
				CellStyle fillStyle = isBlue ? blueFillStyle : centeredStyle;
				isBlue = !isBlue;

				// Colonne "Terr. no"
				createMergedCell(sheet, territoryRow, dateRow, 0, territory.getName(), fillStyle);

				// Colonne "Parcouru pour la dernière fois le"
				createMergedCell(sheet, territoryRow, dateRow, 1,
						territory.getLastModifiedDate() != null ? territory.getLastModifiedDate().format(dateFormatter) : "",
						fillStyle);

				// Ajout des Assignments
				List<Assignment> assignments = territory.getAssignments();
				for (int i = 0; i < 4; i++) {
					int colStart = 2 + (i * 2);

					if (i < assignments.size()) {
						Assignment assignment = assignments.get(i);
						String personName = assignment.getPerson() != null ? assignment.getPerson().getFirstName() + " " + assignment.getPerson().getLastName() : "";
						String assignedDate = assignment.getAssignmentDate() != null ? assignment.getAssignmentDate().format(dateFormatter) : "";
						String dueDate = assignment.getDueDate() != null ? assignment.getDueDate().format(dateFormatter) : "";

						createMergedCell(sheet, territoryRow, dateRow, colStart, personName, fillStyle);
						createCell(dateRow, colStart, assignedDate, fillStyle);
						createCell(dateRow, colStart + 1, dueDate, fillStyle);
					} else {
						createMergedCell(sheet, territoryRow, dateRow, colStart, "", fillStyle);
					}
				}
			}

			// Ajustement automatique de la largeur des colonnes
			for (int i = 0; i < 10; i++) {
				sheet.autoSizeColumn(i);
			}
		}

		// ---- Écriture en mémoire ----
		workbook.write(outputStream);
		workbook.close();
	}

	private void createHeaderRow(Sheet sheet, int startRow, CellStyle headerStyle) {
		Row row1 = sheet.createRow(startRow);
		Row row2 = sheet.createRow(startRow + 1);

		// "Terr. no" fusionné sur 2 lignes
		Cell cell = row1.createCell(0);
		cell.setCellValue("Terr. no");
		cell.setCellStyle(headerStyle);
		sheet.addMergedRegion(new CellRangeAddress(startRow, startRow + 1, 0, 0));

		// "Parcouru pour la dernière fois le*" fusionné sur 2 lignes
		cell = row1.createCell(1);
		cell.setCellValue("Parcouru pour la dernière fois le*");
		cell.setCellStyle(headerStyle);
		sheet.addMergedRegion(new CellRangeAddress(startRow, startRow + 1, 1, 1));

		// Fusion des titres "Attribué à" sur 2 colonnes
		int colStart = 2;
		for (int i = 0; i < 4; i++) {
			cell = row1.createCell(colStart);
			cell.setCellValue("Attribué à");
			cell.setCellStyle(headerStyle);
			sheet.addMergedRegion(new CellRangeAddress(startRow, startRow, colStart, colStart + 1));

			// Ajout des sous-colonnes
			cell = row2.createCell(colStart);
			cell.setCellValue("Attribué le");
			cell.setCellStyle(headerStyle);

			cell = row2.createCell(colStart + 1);
			cell.setCellValue("Entièrement parcouru le");
			cell.setCellStyle(headerStyle);

			colStart += 2;
		}
	}

	private void createMergedCell(Sheet sheet, Row row1, Row row2, int col, String value, CellStyle style) {
		Cell cell = row1.createCell(col);
		cell.setCellValue(value);
		cell.setCellStyle(style);
		sheet.addMergedRegion(new CellRangeAddress(row1.getRowNum(), row2.getRowNum(), col, col));
	}

	private void createCell(Row row, int col, String value, CellStyle style) {
		Cell cell = row.createCell(col);
		cell.setCellValue(value);
		cell.setCellStyle(style);
	}

	private CellStyle createHeaderStyle(Workbook workbook) {
		CellStyle style = workbook.createCellStyle();
		style.setAlignment(HorizontalAlignment.CENTER);
		style.setVerticalAlignment(VerticalAlignment.CENTER);
		return style;
	}

	private CellStyle createSubHeaderStyle(Workbook workbook) {
		CellStyle style = workbook.createCellStyle();
		style.setAlignment(HorizontalAlignment.CENTER);
		style.setVerticalAlignment(VerticalAlignment.CENTER);
		style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
		style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
		return style;
	}

	private CellStyle createCenteredStyle(Workbook workbook) {
		CellStyle style = workbook.createCellStyle();
		style.setAlignment(HorizontalAlignment.CENTER);
		style.setVerticalAlignment(VerticalAlignment.CENTER);
		return style;
	}

	private CellStyle createBlueRowStyle(Workbook workbook) {
		CellStyle style = createCenteredStyle(workbook);
		style.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
		style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
		return style;
	}
}
