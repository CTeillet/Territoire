package com.teillet.territoire.service;

import com.teillet.territoire.dto.exportExcel.CityExportDto;
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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
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

		excelService.importExcel(file);

		verify(assignmentRepository).save(any());
		verify(territoryRepository).save(territory);
	}
}
