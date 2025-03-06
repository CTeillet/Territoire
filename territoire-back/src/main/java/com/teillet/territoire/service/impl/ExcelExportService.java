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
		CellStyle subHeaderStyle = createSubHeaderStyle(workbook);
		CellStyle centeredStyle = createCenteredStyle(workbook);
		CellStyle blueFillStyle = createBlueRowStyle(workbook);

		for (City city : cities) {
			Sheet sheet = workbook.createSheet(city.getName());
			int rowNum = 0;

			// ---- Titre de la ville ----
			Row cityRow = sheet.createRow(rowNum++);
			Cell cityCell = cityRow.createCell(0);
			cityCell.setCellValue(city.getName());
			cityCell.setCellStyle(createYearStyle(workbook)); // Appliquer le style de l'année scolaire
			sheet.addMergedRegion(new CellRangeAddress(cityRow.getRowNum(), cityRow.getRowNum(), 0, 9));

			// ---- Ajout de l'année scolaire ----
			Row yearRow = sheet.createRow(rowNum++);
			Cell yearCell = yearRow.createCell(0);
			yearCell.setCellValue("2024-2025"); // Année scolaire en cours
			yearCell.setCellStyle(createYearStyle(workbook));
			sheet.addMergedRegion(new CellRangeAddress(yearRow.getRowNum(), yearRow.getRowNum(), 0, 9));

			// ---- En-tête ----
			createHeaderRow(sheet, rowNum, subHeaderStyle);
			sheet.setColumnWidth(1, sheet.getColumnWidth(1) * 2);

			// ---- Ajuster la largeur des colonnes pour qu'elles aient toutes la même taille ----
			// Définition d'une largeur fixe basée sur "Entièrement parcouru le"
			int columnWidth = 6000; // Ajuste cette valeur si nécessaire

			// Appliquer la largeur à toutes les colonnes concernées
			sheet.setColumnWidth(2, columnWidth); // "Attribué le"
			sheet.setColumnWidth(3, columnWidth); // "Entièrement parcouru le"
			sheet.setColumnWidth(4, columnWidth); // "Attribué le"
			sheet.setColumnWidth(5, columnWidth); // "Entièrement parcouru le"
			sheet.setColumnWidth(6, columnWidth); // "Attribué le"
			sheet.setColumnWidth(7, columnWidth); // "Entièrement parcouru le"
			sheet.setColumnWidth(8, columnWidth); // "Attribué le"
			sheet.setColumnWidth(9, columnWidth); // "Entièrement parcouru le"

			rowNum += 2; // Ligne où les territoires commencent

			// ---- Remplissage des territoires ----
			boolean isBlue = false;
			for (Territory territory : city.getTerritories()) {
				Row territoryRow = sheet.createRow(rowNum++);
				Row dateRow = sheet.createRow(rowNum++);

				// Alternance des couleurs
				CellStyle fillStyle = isBlue ? blueFillStyle : centeredStyle;
				isBlue = !isBlue;

				// 1️⃣ Colonne "Terr. no" (fusion sur 2 lignes)
				createMergedCell(sheet, territoryRow, dateRow, 0, territory.getName(), fillStyle);

				// 2️⃣ Colonne "Parcouru pour la dernière fois le*" (fusion sur 2 lignes)
				createMergedCell(sheet, territoryRow, dateRow, 1,
						territory.getLastModifiedDate() != null ? territory.getLastModifiedDate().format(dateFormatter) : "",
						fillStyle);

				// 3️⃣ Gestion des Assignments (4 maximum)
				List<Assignment> assignments = territory.getAssignments();
				for (int i = 0; i < 4; i++) {
					int colStart = 2 + (i * 2); // Déplacement par blocs de 2 colonnes

					if (i < assignments.size()) {
						Assignment assignment = assignments.get(i);
						String personName = assignment.getPerson() != null ? assignment.getPerson().getFirstName() + " " + assignment.getPerson().getLastName() : "";
						String assignedDate = assignment.getAssignmentDate() != null ? assignment.getAssignmentDate().format(dateFormatter) : "";
						String dueDate = assignment.getDueDate() != null ? assignment.getDueDate().format(dateFormatter) : "";

						// 3️⃣.1️⃣ Ligne 1 : Fusion pour le nom/prénom (2 colonnes de large)
						createMergedCell(sheet, territoryRow, null, colStart, personName, fillStyle);
						sheet.addMergedRegion(new CellRangeAddress(territoryRow.getRowNum(), territoryRow.getRowNum(), colStart, colStart + 1));

						// 3️⃣.2️⃣ Ligne 2 : Attribution et date de retour
						createCell(dateRow, colStart, assignedDate, fillStyle);
						createCell(dateRow, colStart + 1, dueDate, fillStyle);
					} else {
						// Remplissage avec cellules vides (alignement)
						createMergedCell(sheet, territoryRow, null, colStart, "", fillStyle);
						sheet.addMergedRegion(new CellRangeAddress(territoryRow.getRowNum(), territoryRow.getRowNum(), colStart, colStart + 1));
						createCell(dateRow, colStart, "", fillStyle);
						createCell(dateRow, colStart + 1, "", fillStyle);
					}
				}
			}

		}

		// ---- Écriture en mémoire ----
		workbook.write(outputStream);
		workbook.close();
	}

	private void createHeaderRow(Sheet sheet, int startRow, CellStyle headerStyle) {
		Row row1 = sheet.createRow(startRow);
		Row row2 = sheet.createRow(startRow + 1);

		// Appliquer une hauteur plus grande aux lignes d'en-tête
		row1.setHeightInPoints(25);
		row2.setHeightInPoints(25);

		// "Terr. no" fusionné sur 2 lignes avec bordures
		createStyledCell(sheet, row1, row2, 0, "Terr. no", headerStyle);

		// "Parcouru pour la dernière fois le*" fusionné sur 2 lignes avec retour à la ligne et bordures
		CellStyle wrappedHeaderStyle = createWrappedHeaderStyle(sheet.getWorkbook());
		createStyledCell(sheet, row1, row2, 1, "Parcouru pour la\ndernière fois le*", wrappedHeaderStyle);

		// Fusion des titres "Attribué à" sur 2 colonnes avec bordures
		int colStart = 2;
		for (int i = 0; i < 4; i++) {
			createStyledCell(sheet, row1, null, colStart, "Attribué à", headerStyle);
			CellRangeAddress mergedRegion = new CellRangeAddress(startRow, startRow, colStart, colStart + 1);
			sheet.addMergedRegion(mergedRegion);
			applyBordersToMergedRegion(sheet, mergedRegion, headerStyle);

			// Ajout des sous-colonnes avec bordures
			createStyledCell(sheet, row2, null, colStart, "Attribué le", headerStyle);
			createStyledCell(sheet, row2, null, colStart + 1, "Entièrement parcouru le", headerStyle);

			colStart += 2;
		}
	}


	private void createMergedCell(Sheet sheet, Row row1, Row row2, int col, String value, CellStyle style) {
		Cell cell = row1.createCell(col);
		cell.setCellValue(value);
		cell.setCellStyle(style);

		// Fusion seulement si row2 existe
		if (row2 != null) {
			CellRangeAddress mergedRegion = new CellRangeAddress(row1.getRowNum(), row2.getRowNum(), col, col);
			sheet.addMergedRegion(mergedRegion);
			applyBordersToMergedRegion(sheet, mergedRegion);
		} else {
			applyBorders(cell);
		}
	}

	private void createCell(Row row, int col, String value, CellStyle style) {
		Cell cell = row.createCell(col);
		cell.setCellValue(value);
		cell.setCellStyle(style);
		applyBorders(cell);
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

	private void createStyledCell(Sheet sheet, Row row1, Row row2, int col, String value, CellStyle style) {
		Cell cell = row1.createCell(col);
		cell.setCellValue(value);
		cell.setCellStyle(style);
		applyBorders(cell);

		if (row2 != null) {
			Cell cell2 = row2.createCell(col);
			cell2.setCellStyle(style);
			applyBorders(cell2);

			// Fusionner verticalement
			CellRangeAddress mergedRegion = new CellRangeAddress(row1.getRowNum(), row2.getRowNum(), col, col);
			sheet.addMergedRegion(mergedRegion);

			// Appliquer les bordures après fusion
			applyBordersToMergedRegion(sheet, mergedRegion, style);
		}
	}


	private void applyBorders(Cell cell) {
		CellStyle style = cell.getCellStyle();
		if (style == null) {
			style = cell.getSheet().getWorkbook().createCellStyle();
		}
		style.setBorderTop(BorderStyle.THIN);
		style.setBorderBottom(BorderStyle.THIN);
		style.setBorderLeft(BorderStyle.THIN);
		style.setBorderRight(BorderStyle.THIN);
		cell.setCellStyle(style);
	}


	private CellStyle createWrappedHeaderStyle(Workbook workbook) {
		CellStyle style = workbook.createCellStyle();
		style.setAlignment(HorizontalAlignment.CENTER);
		style.setVerticalAlignment(VerticalAlignment.CENTER);
		style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
		style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
		style.setWrapText(true); // Activation du retour à la ligne
		style.setBorderTop(BorderStyle.THIN);
		style.setBorderBottom(BorderStyle.THIN);
		style.setBorderLeft(BorderStyle.THIN);
		style.setBorderRight(BorderStyle.THIN);
		return style;
	}

	private void applyBordersToMergedRegion(Sheet sheet, CellRangeAddress region, CellStyle borderStyle) {
		for (int row = region.getFirstRow(); row <= region.getLastRow(); row++) {
			Row sheetRow = sheet.getRow(row);
			if (sheetRow == null) {
				sheetRow = sheet.createRow(row);
			}

			for (int col = region.getFirstColumn(); col <= region.getLastColumn(); col++) {
				Cell cell = sheetRow.getCell(col);
				if (cell == null) {
					cell = sheetRow.createCell(col);
				}
				cell.setCellStyle(borderStyle);
			}
		}
	}

	private CellStyle createYearStyle(Workbook workbook) {
		CellStyle style = workbook.createCellStyle();
		Font font = workbook.createFont();
		font.setBold(true);
		font.setFontHeightInPoints((short) 16); // Augmenté pour le titre de la ville
		style.setFont(font);
		style.setAlignment(HorizontalAlignment.CENTER);
		style.setVerticalAlignment(VerticalAlignment.CENTER);
		return style;
	}

	private void applyBordersToMergedRegion(Sheet sheet, CellRangeAddress region) {
		Workbook workbook = sheet.getWorkbook();
		CellStyle borderStyle = workbook.createCellStyle();

		// Définition des bordures
		borderStyle.setBorderTop(BorderStyle.THIN);
		borderStyle.setBorderBottom(BorderStyle.THIN);
		borderStyle.setBorderLeft(BorderStyle.THIN);
		borderStyle.setBorderRight(BorderStyle.THIN);

		for (int row = region.getFirstRow(); row <= region.getLastRow(); row++) {
			Row sheetRow = sheet.getRow(row);
			if (sheetRow == null) {
				sheetRow = sheet.createRow(row);
			}

			for (int col = region.getFirstColumn(); col <= region.getLastColumn(); col++) {
				Cell cell = sheetRow.getCell(col);
				if (cell == null) {
					cell = sheetRow.createCell(col);
				}
				cell.setCellStyle(borderStyle);
			}
		}
	}


}
