package com.teillet.territoire.service.impl;

import com.teillet.territoire.designPattern.ExcelGenerator;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.IExcelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ExcelService implements IExcelService {

	private final PersonService personService;
	private final TerritoryRepository territoryRepository;
	private final AssignmentRepository assignmentRepository;

	@Override
	public void generateExcel(List<City> cities, ByteArrayOutputStream outputStream) throws IOException {
		try (Workbook workbook = new XSSFWorkbook()) {
			ExcelGenerator excelGenerator = new ExcelGenerator(workbook);
			excelGenerator.generate(cities);
			workbook.write(outputStream);
		}
	}

	@Override
	public void importExcel(MultipartFile file) throws IOException {
		try (InputStream inputStream = file.getInputStream()) {
			Workbook workbook = WorkbookFactory.create(inputStream);
			Sheet sheet = workbook.getSheetAt(0);

			extractTerritories(sheet);
		} catch (Exception e) {
			log.error(e.getMessage(), e);
			throw e;
		}
	}

	private void extractTerritories(Sheet sheet) {
		List<Person> personList = personService.getAllPersons();

		// Ici on parse comme dans l’exemple précédent
		for (int rowIndex = 4; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
			Row row = sheet.getRow(rowIndex);
			if (row == null) continue;

			String terrId = getCellValue(row.getCell(0));
			Territory territory = territoryRepository.findByName(terrId);
			if (territory == null) {
				log.warn("Territoire non trouvé: {}", terrId);
				continue;
			}

			extractAssignments(row, sheet, rowIndex, terrId, personList, territory);

			// Sauter la ligne suivante car elle a déjà été lue pour les dates
			rowIndex++;
		}
	}

	private void extractAssignments(Row row, Sheet sheet, int rowIndex, String terrId, List<Person> personList, Territory territory) {
		for (int col = 2; col < row.getLastCellNum(); col += 2) {
			String name = getCellValue(row.getCell(col, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK));

			if (name != null && !name.isEmpty()) {
				// Lire les dates sur la ligne suivante
				Row dateRow = sheet.getRow(rowIndex + 1);
				if (dateRow == null) continue;

				String attribLe = getCellValue(dateRow.getCell(col, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK));
				String parcouruLe = getCellValue(dateRow.getCell(col + 1, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK));

				log.info("Territoire {} -> {} (attribué le {}, parcouru le {})",
						terrId, name, attribLe, parcouruLe);

				LocalDate assignmentDate = LocalDate.parse(attribLe);

				Person person = personList.stream()
						.filter(p -> normalize(p.getFirstName() + " " + p.getLastName()).equals(normalize(name)))
						.findFirst()
						.orElse(null);
				if (person == null) {
					log.warn("Personne {} non trouvée", name);
					continue;
				}

				Assignment assignment = new Assignment();
				assignment.setTerritory(territory);
				assignment.setAssignmentDate(assignmentDate);
				assignment.setDueDate(assignmentDate.plusMonths(4));
				assignment.setPerson(person);
				if (parcouruLe != null && !parcouruLe.isEmpty()) {
					assignment.setReturnDate(assignmentDate);
					territory.setStatus(TerritoryStatus.PENDING);
				} else {
					territory.setStatus(TerritoryStatus.ASSIGNED);
				}

				log.info("Assignment {} -> {}", terrId, assignment);

				assignmentRepository.save(assignment);
				territoryRepository.save(territory);

			}
		}
	}

	private String normalize(String input) {
			return Normalizer.normalize(input, Normalizer.Form.NFD)
					.replaceAll("\\p{InCombiningDiacriticalMarks}", "")
					.replaceAll("[’']", "") // supprime les apostrophes typographiques ou simples
					.toUpperCase()
					.trim();
		}

		private String getCellValue(Cell cell) {
			if (cell == null) return null;
			switch (cell.getCellType()) {
				case STRING: return cell.getStringCellValue();
				case NUMERIC:
					if (DateUtil.isCellDateFormatted(cell)) {
						return cell.getLocalDateTimeCellValue().toLocalDate().toString();
					} else {
						return String.valueOf((int) cell.getNumericCellValue());
					}
				case FORMULA: return cell.getCellFormula();
				default: return null;
			}
		}
}
