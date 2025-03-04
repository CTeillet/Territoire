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
		CellStyle blueFillStyle = createBlueFillStyle(workbook);

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
			Row headerRow = sheet.createRow(rowNum++);
			createHeaderRow(headerRow, sheet, headerStyle);

			// ---- Remplissage des territoires ----
			boolean isBlue = false;
			for (Territory territory : city.getTerritories()) {
				int startRow = rowNum;
				Row territoryRow = sheet.createRow(rowNum++);
				Row dateRow = sheet.createRow(rowNum++);

				// Alternance des couleurs
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

	private void createHeaderRow(Row row, Sheet sheet, CellStyle style) {
		String[] headers = {"Terr. no", "Parcouru pour la dernière fois le", "Attribué à", "", "Attribué à", "", "Attribué à", "", "Attribué à", ""};

		for (int i = 0; i < headers.length; i++) {
			Cell cell = row.createCell(i);
			cell.setCellValue(headers[i]);
			cell.setCellStyle(style);
		}

		// Fusionner les cellules "Attribué à" au-dessus des 2 colonnes correspondantes
		for (int i = 2; i <= 8; i += 2) {
			sheet.addMergedRegion(new CellRangeAddress(row.getRowNum(), row.getRowNum(), i, i + 1));
		}
	}

	private void createHeaderRow(Row row, CellStyle style) {
		String[] headers = {"Terr. no", "Parcouru pour la dernière fois le", "Attribué à", "", "Attribué à", "", "Attribué à", "", "Attribué à", ""};

		for (int i = 0; i < headers.length; i++) {
			Cell cell = row.createCell(i);
			cell.setCellValue(headers[i]);
			cell.setCellStyle(style);
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
		style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
		style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
		return style;
	}

	private CellStyle createSubHeaderStyle(Workbook workbook) {
		CellStyle style = workbook.createCellStyle();
		style.setAlignment(HorizontalAlignment.CENTER);
		style.setVerticalAlignment(VerticalAlignment.CENTER);
		return style;
	}

	private CellStyle createCenteredStyle(Workbook workbook) {
		CellStyle style = workbook.createCellStyle();
		style.setAlignment(HorizontalAlignment.CENTER);
		style.setVerticalAlignment(VerticalAlignment.CENTER);
		return style;
	}

	private CellStyle createBlueFillStyle(Workbook workbook) {
		CellStyle style = createCenteredStyle(workbook);
		style.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
		style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
		return style;
	}
}
