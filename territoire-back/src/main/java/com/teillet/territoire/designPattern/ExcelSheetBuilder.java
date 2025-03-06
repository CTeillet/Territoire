package com.teillet.territoire.designPattern;

import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;


public class ExcelSheetBuilder {
	private static final int TERRITORY_NAME_COL = 0;
	private static final int LAST_MODIFIED_DATE_COL = 1;
	private static final int ASSIGNMENT_START_COL = 2;
	private static final int MAX_ASSIGNMENTS = 4;

	private final Workbook workbook;
	private final Sheet sheet;
	private int rowNum;

	public static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	public ExcelSheetBuilder(Workbook workbook, Sheet sheet) {
		this.workbook = workbook;
		this.sheet = sheet;
		this.rowNum = 0;
	}

	/**
	 * Sets the width of a specific column.
	 *
	 * @param columnIndex The index of the column.
	 * @param width       The width to set.
	 * @return The ExcelSheetBuilder instance.
	 */
	public ExcelSheetBuilder setColumnWidth(int columnIndex, int width) {
		sheet.setColumnWidth(columnIndex, width);
		return this;
	}

	/**
	 * Adds a header for a city to the sheet.
	 *
	 * @param city The city to add.
	 * @return The ExcelSheetBuilder instance.
	 */
	public ExcelSheetBuilder addCityHeader(City city) {
		CellStyle yearStyle = CellStyleFactory.createYearStyle(workbook);
		createMergedCell(rowNum++, 0, 9, city.getName(), yearStyle);
		createMergedCell(rowNum++, 0, 9, "2024-2025", yearStyle);
		return this;
	}

	/**
	 * Adds territories to the sheet.
	 *
	 * @param territories The list of territories to add.
	 * @return The ExcelSheetBuilder instance.
	 */
	public ExcelSheetBuilder addTerritories(List<Territory> territories) {
		CellStyle subHeaderStyle = CellStyleFactory.createSubHeaderStyle(workbook);
		CellStyle wrappedHeaderStyle = CellStyleFactory.createWrappedHeaderStyle(workbook);
		createHeaderRow(subHeaderStyle, wrappedHeaderStyle);

		CellStyle centeredStyle = CellStyleFactory.createCenteredStyle(workbook);
		CellStyle blueFillStyle = CellStyleFactory.createBlueRowStyle(workbook);

		boolean isBlue = false;
		for (Territory territory : territories) {
			Row territoryRow = sheet.createRow(rowNum++);
			Row dateRow = sheet.createRow(rowNum++);

			CellStyle fillStyle = isBlue ? blueFillStyle : centeredStyle;
			isBlue = !isBlue;

			createTerritoryCells(territoryRow, dateRow, territory, fillStyle);
		}
		return this;
	}

	private void createTerritoryCells(Row territoryRow, Row dateRow, Territory territory, CellStyle fillStyle) {
		createMergedCell(territoryRow, dateRow, TERRITORY_NAME_COL, territory.getName(), fillStyle);
		String lastModifiedDate = formatDate(territory.getLastModifiedDate());
		createMergedCell(territoryRow, dateRow, LAST_MODIFIED_DATE_COL, lastModifiedDate, fillStyle);

		List<Assignment> assignments = territory.getAssignments();
		for (int i = 0; i < MAX_ASSIGNMENTS; i++) {
			int colStart = ASSIGNMENT_START_COL + (i * 2);
			if (i < assignments.size()) {
				Assignment assignment = assignments.get(i);
				createAssignmentCells(territoryRow, dateRow, colStart, assignment, fillStyle);
			} else {
				createEmptyAssignmentCells(territoryRow, dateRow, colStart, fillStyle);
			}
		}
	}

	private void createAssignmentCells(Row territoryRow, Row dateRow, int colStart, Assignment assignment, CellStyle fillStyle) {
		String personName = getPersonName(assignment);
		String assignedDate = formatDate(assignment.getAssignmentDate());
		String dueDate = formatDate(assignment.getDueDate());

		createMergedCell(territoryRow, null, colStart, personName, fillStyle);
		sheet.addMergedRegion(new CellRangeAddress(territoryRow.getRowNum(), territoryRow.getRowNum(), colStart, colStart + 1));
		createCell(dateRow, colStart, assignedDate, fillStyle);
		createCell(dateRow, colStart + 1, dueDate, fillStyle);
	}

	private void createEmptyAssignmentCells(Row territoryRow, Row dateRow, int colStart, CellStyle fillStyle) {
		createMergedCell(territoryRow, null, colStart, "", fillStyle);
		sheet.addMergedRegion(new CellRangeAddress(territoryRow.getRowNum(), territoryRow.getRowNum(), colStart, colStart + 1));
		createCell(dateRow, colStart, "", fillStyle);
		createCell(dateRow, colStart + 1, "", fillStyle);
	}

	private void createHeaderRow(CellStyle headerStyle, CellStyle wrappedHeaderStyle) {
		Row row1 = sheet.createRow(rowNum);
		Row row2 = sheet.createRow(rowNum + 1);
		row1.setHeightInPoints(25);
		row2.setHeightInPoints(25);

		createStyledCell(row1, row2, 0, "Terr. no", headerStyle);
		createStyledCell(row1, row2, 1, "Parcouru pour la\ndernière fois le*", wrappedHeaderStyle);

		int colStart = ASSIGNMENT_START_COL;
		for (int i = 0; i < MAX_ASSIGNMENTS; i++) {
			createStyledCell(row1, null, colStart, "Attribué à", headerStyle);
			CellRangeAddress mergedRegion = new CellRangeAddress(rowNum, rowNum, colStart, colStart + 1);
			sheet.addMergedRegion(mergedRegion);
			applyBordersToMergedRegion(mergedRegion, headerStyle);

			createStyledCell(row2, null, colStart, "Attribué le", headerStyle);
			createStyledCell(row2, null, colStart + 1, "Entièrement parcouru le", headerStyle);

			colStart += 2;
		}
		rowNum += 2;
	}

	private void createMergedCell(int rowNum, int firstCol, int lastCol, String value, CellStyle style) {
		Row row = sheet.getRow(rowNum);
		if (row == null) {
			row = sheet.createRow(rowNum);
		}
		Cell cell = row.createCell(firstCol);
		cell.setCellValue(value);
		cell.setCellStyle(style);
		sheet.addMergedRegion(new CellRangeAddress(rowNum, rowNum, firstCol, lastCol));
		applyBordersToMergedRegion(new CellRangeAddress(rowNum, rowNum, firstCol, lastCol), style);
	}

	private void createMergedCell(Row row1, Row row2, int col, String value, CellStyle style) {
		Cell cell = row1.createCell(col);
		cell.setCellValue(value);
		cell.setCellStyle(style);

		if (row2 != null) {
			CellRangeAddress mergedRegion = new CellRangeAddress(row1.getRowNum(), row2.getRowNum(), col, col);
			sheet.addMergedRegion(mergedRegion);
			applyBordersToMergedRegion(mergedRegion, style);
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

	private void createStyledCell(Row row1, Row row2, int col, String value, CellStyle style) {
		Cell cell = row1.createCell(col);
		cell.setCellValue(value);
		cell.setCellStyle(style);
		applyBorders(cell);

		if (row2 != null) {
			Cell cell2 = row2.createCell(col);
			cell2.setCellStyle(style);
			applyBorders(cell2);
			sheet.addMergedRegion(new CellRangeAddress(row1.getRowNum(), row2.getRowNum(), col, col));
			applyBordersToMergedRegion(new CellRangeAddress(row1.getRowNum(), row2.getRowNum(), col, col), style);
		}
	}

	private void applyBorders(Cell cell) {
		CellStyle style = cell.getCellStyle();
		style.setBorderTop(BorderStyle.THIN);
		style.setBorderBottom(BorderStyle.THIN);
		style.setBorderLeft(BorderStyle.THIN);
		style.setBorderRight(BorderStyle.THIN);
		cell.setCellStyle(style);
	}

	private void applyBordersToMergedRegion(CellRangeAddress region, CellStyle borderStyle) {
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
				// Apply borders to each cell in the merged region
				applyBorders(cell);
			}
		}
	}

	private String getPersonName(Assignment assignment) {
		if (assignment.getPerson() != null) {
			return assignment.getPerson().getFirstName() + " " + assignment.getPerson().getLastName();
		}
		return "";
	}

	private String formatDate(LocalDate date) {
		return date != null ? date.format(DATE_FORMATTER) : "";
	}

	/**
	 * Builds and returns the sheet.
	 *
	 * @return The built sheet.
	 */
	public Sheet build() {
		return sheet;
	}
}
