package com.teillet.territoire.designPattern;

import com.teillet.territoire.dto.CampaignStatisticsDto;
import com.teillet.territoire.enums.TerritoryType;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CampaignStatisticsExcelGeneratorTest {

	@Test
	void testGenerate_WithFullData() throws IOException {
		CampaignStatisticsDto stats = CampaignStatisticsDto.builder()
				.campaignName("Campagne Principale")
				.usedTerritories(10)
				.availableTerritories(5)
				.totalTerritoriesByType(Map.of(TerritoryType.HOUSE, 8, TerritoryType.BUILDING, 7))
				.usedTerritoriesByType(Map.of(TerritoryType.HOUSE, 5, TerritoryType.BUILDING, 5))
				.totalTerritoriesByCity(Map.of("Rennes", 10, "Cesson", 5))
				.usedTerritoriesByCity(Map.of("Rennes", 7, "Cesson", 3))
				.build();

		CampaignStatisticsExcelGenerator generator = new CampaignStatisticsExcelGenerator(stats);
		byte[] result = generator.generate();

		assertNotNull(result);
		assertTrue(result.length > 0);

		try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(result))) {
			assertEquals(3, workbook.getNumberOfSheets());
			assertNotNull(workbook.getSheet("Données_Stats"));
			assertNotNull(workbook.getSheet("Résumé"));
			assertNotNull(workbook.getSheet("Graphiques"));
		}
	}

	@Test
	void testGenerate_WithEmptyMaps() throws IOException {
		CampaignStatisticsDto stats = CampaignStatisticsDto.builder()
				.campaignName("Campagne Vide")
				.usedTerritories(0)
				.availableTerritories(0)
				.totalTerritoriesByType(Map.of())
				.usedTerritoriesByType(Map.of())
				.totalTerritoriesByCity(Map.of())
				.usedTerritoriesByCity(Map.of())
				.build();

		CampaignStatisticsExcelGenerator generator = new CampaignStatisticsExcelGenerator(stats);
		byte[] result = generator.generate();

		assertNotNull(result);
		assertTrue(result.length > 0);

		try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(result))) {
			assertEquals(3, workbook.getNumberOfSheets());
		}
	}
}
