package com.teillet.territoire.service;

import com.teillet.territoire.dto.DurationSettingsDto;
import com.teillet.territoire.dto.exportExcel.AssignmentExportDto;
import com.teillet.territoire.dto.exportExcel.CityExportDto;
import com.teillet.territoire.dto.exportExcel.TerritoryExportDto;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.impl.ExcelService;
import com.teillet.territoire.service.impl.PersonService;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExcelServiceTest {

	@Mock
	private PersonService personService;

	@Mock
	private TerritoryRepository territoryRepository;

	@Mock
	private AssignmentRepository assignmentRepository;

	@Mock
	private CityRepository cityRepository;

	@Mock
	private ISettingService settingService;

	@InjectMocks
	private ExcelService excelService;

	@Test
	void testGenerateExcel() throws IOException {
		ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
		List<CityExportDto> cities = new ArrayList<>();

		excelService.generateExcel(cities, outputStream, 2024);

		byte[] bytes = outputStream.toByteArray();
		assertNotNull(bytes);
		assertTrue(bytes.length > 0);
	}

	@Test
	void testExportExcel() throws IOException {
		City city = City.builder().id(UUID.randomUUID()).name("Rennes").territories(new ArrayList<>()).build();
		when(cityRepository.findAll()).thenReturn(List.of(city));

		byte[] bytes = excelService.exportExcel(2024);
		assertNotNull(bytes);
		assertTrue(bytes.length > 0);
	}

	@Test
	void testImportExcel() throws IOException {
		// Construct a sample Excel workbook for import
		byte[] excelData;
		try (Workbook workbook = new XSSFWorkbook()) {
			Sheet sheet = workbook.createSheet("Import");
			// Header rows (indices 0 to 3)
			for (int r = 0; r < 4; r++) {
				sheet.createRow(r);
			}

			// Row 4: Territory row
			Row row4 = sheet.createRow(4);
			row4.createCell(0).setCellValue("T01");
			row4.createCell(2).setCellValue("Jean Dupont");

			// Row 5: Date row
			Row row5 = sheet.createRow(5);
			row5.createCell(2).setCellValue("2024-01-15");
			row5.createCell(3).setCellValue("2024-02-15");

			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			workbook.write(bos);
			excelData = bos.toByteArray();
		}

		MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData);

		Person person = Person.builder().id(UUID.randomUUID()).firstName("Jean").lastName("Dupont").build();
		Territory territory = Territory.builder().id(UUID.randomUUID()).name("T01").build();

		when(personService.getAllPersons()).thenReturn(List.of(person));
		when(territoryRepository.findByName("T01")).thenReturn(territory);
		when(settingService.getDurationSettings()).thenReturn(new DurationSettingsDto(3, 4));

		excelService.importExcel(file);

		// Échéance = attribution + durée d'attribution des paramètres
		ArgumentCaptor<Assignment> saved = ArgumentCaptor.forClass(Assignment.class);
		verify(assignmentRepository).save(saved.capture());
		assertEquals(LocalDate.of(2024, 4, 15), saved.getValue().getDueDate());
		verify(territoryRepository).save(territory);
	}

	@Test
	void testImportExcel_InvalidDate_ThrowsClearError() throws IOException {
		byte[] excelData;
		try (Workbook workbook = new XSSFWorkbook()) {
			Sheet sheet = workbook.createSheet("Import");
			for (int r = 0; r < 4; r++) {
				sheet.createRow(r);
			}
			Row row4 = sheet.createRow(4);
			row4.createCell(0).setCellValue("T01");
			row4.createCell(2).setCellValue("Jean Dupont");
			Row row5 = sheet.createRow(5);
			row5.createCell(2).setCellValue("15 janvier 2024");

			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			workbook.write(bos);
			excelData = bos.toByteArray();
		}
		MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData);
		when(personService.getAllPersons()).thenReturn(List.of());
		when(territoryRepository.findByName("T01")).thenReturn(Territory.builder().id(UUID.randomUUID()).name("T01").build());
		when(settingService.getDurationSettings()).thenReturn(new DurationSettingsDto(4, 4));

		IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> excelService.importExcel(file));
		assertTrue(e.getMessage().contains("T01"));
		assertTrue(e.getMessage().contains("JJ/MM/AAAA"));
		verify(assignmentRepository, never()).save(any());
	}

	@Test
	void importAcceptsTheDatesWrittenByTheExport() throws IOException {
		byte[] excelData;
		try (Workbook workbook = new XSSFWorkbook()) {
			Sheet sheet = workbook.createSheet("Import");
			for (int r = 0; r < 4; r++) {
				sheet.createRow(r);
			}
			Row row4 = sheet.createRow(4);
			row4.createCell(0).setCellValue("T01");
			row4.createCell(2).setCellValue("Jean Dupont");
			Row row5 = sheet.createRow(5);
			// Dates en texte JJ/MM/AAAA, comme dans le fichier exporté
			row5.createCell(2).setCellValue("15/01/2024");
			row5.createCell(3).setCellValue("20/03/2024");

			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			workbook.write(bos);
			excelData = bos.toByteArray();
		}
		MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData);
		Person person = Person.builder().id(UUID.randomUUID()).firstName("Jean").lastName("Dupont").build();
		when(personService.getAllPersons()).thenReturn(List.of(person));
		when(territoryRepository.findByName("T01")).thenReturn(Territory.builder().id(UUID.randomUUID()).name("T01").build());
		when(settingService.getDurationSettings()).thenReturn(new DurationSettingsDto(4, 4));

		excelService.importExcel(file);

		ArgumentCaptor<Assignment> saved = ArgumentCaptor.forClass(Assignment.class);
		verify(assignmentRepository).save(saved.capture());
		assertEquals(LocalDate.of(2024, 1, 15), saved.getValue().getAssignmentDate());
		assertEquals(LocalDate.of(2024, 3, 20), saved.getValue().getReturnDate());
	}

	@Test
	void exportKeepsTheOrderAndContinuesBeyondFourAssignments() throws IOException {
		List<AssignmentExportDto> assignments = new ArrayList<>();
		for (int i = 1; i <= 6; i++) {
			assignments.add(new AssignmentExportDto("0%d/0%d/2026".formatted(i, i), "", "Personne " + i));
		}
		CityExportDto city = new CityExportDto("Rennes", List.of(
				new TerritoryExportDto("T01", assignments, "01/06/2025"),
				new TerritoryExportDto("T02", List.of(), "nouveau")));
		ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

		excelService.generateExcel(List.of(city), outputStream, 2025);

		try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(outputStream.toByteArray()))) {
			Sheet sheet = workbook.getSheet("Rennes");
			assertEquals("Rennes", text(sheet, 0, 0));
			assertEquals("2025-2026", text(sheet, 1, 0));
			// Lignes 4-5 : quatre premières attributions, dans l'ordre reçu
			assertEquals("T01", text(sheet, 4, 0));
			assertEquals("01/06/2025", text(sheet, 4, 1));
			assertEquals("Personne 1", text(sheet, 4, 2));
			assertEquals("01/01/2026", text(sheet, 5, 2));
			assertEquals("Personne 4", text(sheet, 4, 8));
			// Lignes 6-7 : suite du même territoire
			assertEquals("T01", text(sheet, 6, 0));
			assertEquals("", text(sheet, 6, 1));
			assertEquals("Personne 5", text(sheet, 6, 2));
			assertEquals("06/06/2026", text(sheet, 7, 4));
			assertEquals("", text(sheet, 6, 6));
			// Lignes 8-9 : territoire suivant, sans attribution
			assertEquals("T02", text(sheet, 8, 0));
			assertEquals("nouveau", text(sheet, 8, 1));
			assertEquals("", text(sheet, 8, 2));
		}
	}

	private static String text(Sheet sheet, int row, int col) {
		return sheet.getRow(row).getCell(col).getStringCellValue();
	}
}
