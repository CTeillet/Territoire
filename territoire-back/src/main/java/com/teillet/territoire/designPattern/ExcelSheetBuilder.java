package com.teillet.territoire.designPattern;

import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

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

	public ExcelSheetBuilder setColumnWidth(int columnIndex, int width) {
		sheet.setColumnWidth(columnIndex, width);
		return this;
	}

	public ExcelSheetBuilder addCityHeader(City city) {
		CellStyle yearStyle = CellStyleFactory.createYearStyle(workbook);
		createMergedCell(rowNum, rowNum, 0, 9, city.getName(), yearStyle);
		createMergedCell(rowNum + 1, rowNum + 1, 0, 9, "2024-2025", yearStyle);
		rowNum += 2; // Move to the next row after adding the header
		return this;
	}

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
		createMergedCell(territoryRow.getRowNum(), dateRow.getRowNum(), TERRITORY_NAME_COL, TERRITORY_NAME_COL, territory.getName(), fillStyle);
		String lastVisitDate = formatDate(territory.getAssignments().stream().map(Assignment::getReturnDate).filter(Objects::nonNull).sorted().findFirst().orElse(null), "nouveau");
		createMergedCell(territoryRow.getRowNum(), dateRow.getRowNum(), LAST_MODIFIED_DATE_COL, LAST_MODIFIED_DATE_COL, lastVisitDate, fillStyle);

		List<Assignment> assignments = territory.getAssignments().stream().sorted(Comparator.comparing(Assignment::getAssignmentDate)).toList();
		for (int i = 0; i < MAX_ASSIGNMENTS; i++) {
			int colStart = ASSIGNMENT_START_COL + (i * 2);
			if (i < assignments.size()) {
				createAssignmentCells(territoryRow, dateRow, colStart, assignments.get(i), fillStyle);
			} else {
				createEmptyAssignmentCells(territoryRow, dateRow, colStart, fillStyle);
			}
		}
	}

	private void createAssignmentCells(Row territoryRow, Row dateRow, int colStart, Assignment assignment, CellStyle fillStyle) {
		String personName = getPersonName(assignment);
		String assignedDate = formatDate(assignment.getAssignmentDate(), "");
		String returnDate = formatDate(assignment.getReturnDate(), "");

		createMergedCell(territoryRow.getRowNum(), territoryRow.getRowNum(), colStart, colStart + 1, personName, fillStyle);
		createCell(dateRow, colStart, assignedDate, fillStyle);
		createCell(dateRow, colStart + 1, returnDate, fillStyle);
	}

	private void createEmptyAssignmentCells(Row territoryRow, Row dateRow, int colStart, CellStyle fillStyle) {
		createMergedCell(territoryRow.getRowNum(), territoryRow.getRowNum(), colStart, colStart + 1, "", fillStyle);
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
			createStyledCell(row2, null, colStart, "Attribué le", headerStyle);
			createStyledCell(row2, null, colStart + 1, "Entièrement parcouru le", headerStyle);
			mergeAndApplyBorders(rowNum, rowNum, colStart, colStart + 1, headerStyle);
			colStart += 2;
		}
		rowNum += 2;
	}

	private void createMergedCell(int startRow, int endRow, int startCol, int endCol, String value, CellStyle style) {
		// Define the region to be merged
		CellRangeAddress region = new CellRangeAddress(startRow, endRow, startCol, endCol);
		sheet.addMergedRegion(region);

		// Iterate over each cell in the merged region to ensure it exists and apply styles
		for (int row = startRow; row <= endRow; row++) {
			Row sheetRow = sheet.getRow(row);
			if (sheetRow == null) {
				sheetRow = sheet.createRow(row);
			}
			for (int col = startCol; col <= endCol; col++) {
				Cell cell = sheetRow.getCell(col);
				if (cell == null) {
					cell = sheetRow.createCell(col);
				}
				// Set the value only for the first cell in the merged region
				if (row == startRow && col == startCol) {
					cell.setCellValue(value);
				}
				// Apply the style and borders to each cell in the merged region
				cell.setCellStyle(style);
				applyBorders(cell);
			}
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
		}
	}

	private void applyBorders(Cell cell) {
		CellStyle style = cell.getCellStyle();
		style.setBorderTop(BorderStyle.THIN);
		style.setBorderBottom(BorderStyle.THIN);
		style.setBorderLeft(BorderStyle.THIN);
		style.setBorderRight(BorderStyle.THIN);
	}

	private void mergeAndApplyBorders(int firstRow, int lastRow, int firstCol, int lastCol, CellStyle style) {
		CellRangeAddress region = new CellRangeAddress(firstRow, lastRow, firstCol, lastCol);
		sheet.addMergedRegion(region);
		applyBordersToMergedRegion(region, style);
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
				applyBorders(cell);
			}
		}
	}

	private String getPersonName(Assignment assignment) {
		if (assignment.getPerson() != null) {
			return assignment.getPerson().getFirstName() + " " + assignment.getPerson().getLastName();
		} else if(assignment.getCampaign() != null) {
			return "-- " + assignment.getCampaign().getName() + " --";
		}
		return "";
	}

	private String formatDate(LocalDate date, String alternative) {
		return date != null ? date.format(DATE_FORMATTER) : alternative;
	}

	public Sheet build() {
		return sheet;
	}
}
