package com.teillet.territoire.designPattern;

import com.teillet.territoire.dto.CampaignStatisticsDto;
import com.teillet.territoire.enums.TerritoryType;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xddf.usermodel.chart.*;
import org.apache.poi.xssf.usermodel.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

/**
 * Générateur Excel pour les statistiques de campagne utilisant des graphiques natifs.
 */
public class CampaignStatisticsExcelGenerator {

    private final XSSFWorkbook workbook;
    private final CampaignStatisticsDto statistics;

    public CampaignStatisticsExcelGenerator(CampaignStatisticsDto statistics) {
        this.workbook = new XSSFWorkbook();
        this.statistics = statistics;
    }

    public byte[] generate() throws IOException {
        // 1. Feuille Données (sera masquée à la fin)
        XSSFSheet dataSheet = workbook.createSheet("Données_Stats");
        fillDataSheet(dataSheet);

        // 2. Feuille Résumé
        XSSFSheet summarySheet = workbook.createSheet("Résumé");
        fillSummarySheet(summarySheet);

        // 3. Feuille Graphiques
        XSSFSheet chartsSheet = workbook.createSheet("Graphiques");
        createCharts(chartsSheet, dataSheet);

        // Ajuster les colonnes
        summarySheet.autoSizeColumn(0);
        summarySheet.autoSizeColumn(1);

        try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            workbook.write(bos);
            return bos.toByteArray();
        } finally {
            workbook.close();
        }
    }

    private void fillDataSheet(XSSFSheet sheet) {
        // Section Statut
        Row row = sheet.createRow(0);
        row.createCell(0).setCellValue("Statut");
        row.createCell(1).setCellValue("Nombre");
        
        row = sheet.createRow(1);
        row.createCell(0).setCellValue("Utilisés");
        row.createCell(1).setCellValue(statistics.getUsedTerritories());
        
        row = sheet.createRow(2);
        row.createCell(0).setCellValue("Restants");
        row.createCell(1).setCellValue(statistics.getAvailableTerritories());

        // Section Type
        int startRowType = 4;
        row = sheet.createRow(startRowType++);
        row.createCell(0).setCellValue("Type de territoire");
        row.createCell(1).setCellValue("Utilisés");
        row.createCell(2).setCellValue("Total");

        int currentTypeRow = startRowType;
        for (Map.Entry<TerritoryType, Integer> entry : statistics.getTotalTerritoriesByType().entrySet()) {
            row = sheet.createRow(currentTypeRow++);
            row.createCell(0).setCellValue(entry.getKey().toString());
            row.createCell(1).setCellValue(statistics.getUsedTerritoriesByType().getOrDefault(entry.getKey(), 0));
            row.createCell(2).setCellValue(entry.getValue());
        }

        // Section Ville
        int startRowCity = currentTypeRow + 1;
        row = sheet.createRow(startRowCity++);
        row.createCell(0).setCellValue("Ville");
        row.createCell(1).setCellValue("Utilisés");
        row.createCell(2).setCellValue("Total");

        int currentCityRow = startRowCity;
        for (Map.Entry<String, Integer> entry : statistics.getTotalTerritoriesByCity().entrySet()) {
            row = sheet.createRow(currentCityRow++);
            row.createCell(0).setCellValue(entry.getKey());
            row.createCell(1).setCellValue(statistics.getUsedTerritoriesByCity().getOrDefault(entry.getKey(), 0));
            row.createCell(2).setCellValue(entry.getValue());
        }
    }

    private void fillSummarySheet(XSSFSheet sheet) {
        CellStyle titleStyle = workbook.createCellStyle();
        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 14);
        titleStyle.setFont(titleFont);

        Row row = sheet.createRow(0);
        Cell cell = row.createCell(0);
        cell.setCellValue("Statistiques de la campagne: " + statistics.getCampaignName());
        cell.setCellStyle(titleStyle);

        sheet.createRow(1); // Espace

        row = sheet.createRow(2);
        row.createCell(0).setCellValue("Total des territoires");
        row.createCell(1).setCellValue(statistics.getTotalTerritories());

        row = sheet.createRow(3);
        row.createCell(0).setCellValue("Territoires utilisés");
        row.createCell(1).setCellValue(statistics.getUsedTerritories());

        row = sheet.createRow(4);
        row.createCell(0).setCellValue("Territoires restants");
        row.createCell(1).setCellValue(statistics.getAvailableTerritories());

        row = sheet.createRow(5);
        row.createCell(0).setCellValue("Taux de complétion");
        double completion = statistics.getTotalTerritories() > 0 ? (double) statistics.getUsedTerritories() / statistics.getTotalTerritories() : 0;
        row.createCell(1).setCellValue(completion);
        
        CellStyle percentStyle = workbook.createCellStyle();
        percentStyle.setDataFormat(workbook.createDataFormat().getFormat("0.00%"));
        row.getCell(1).setCellStyle(percentStyle);
    }

    private void createCharts(XSSFSheet sheet, XSSFSheet dataSheet) {
        // 1. Graphique de Statut (Pie Chart)
        XSSFDrawing drawing = sheet.createDrawingPatriarch();
        XSSFClientAnchor anchor = drawing.createAnchor(0, 0, 0, 0, 0, 1, 6, 15);
        XSSFChart chart = drawing.createChart(anchor);
        chart.setTitleText("Répartition des territoires");
        chart.setTitleOverlay(false);

        XDDFChartLegend legend = chart.getOrAddLegend();
        legend.setPosition(LegendPosition.BOTTOM);

        XDDFDataSource<String> statusNames = XDDFDataSourcesFactory.fromStringCellRange(dataSheet, new CellRangeAddress(1, 2, 0, 0));
        XDDFNumericalDataSource<Double> statusValues = XDDFDataSourcesFactory.fromNumericCellRange(dataSheet, new CellRangeAddress(1, 2, 1, 1));

        XDDFPieChartData pieData = (XDDFPieChartData) chart.createData(ChartTypes.PIE, null, null);
        pieData.setVaryColors(true);
        pieData.addSeries(statusNames, statusValues);
        chart.plot(pieData);

        // 2. Graphique par Type (Bar Chart)
        int typeCount = statistics.getTotalTerritoriesByType().size();
        if (typeCount > 0) {
            XSSFClientAnchor anchorType = drawing.createAnchor(0, 0, 0, 0, 7, 1, 15, 15);
            XSSFChart typeChart = drawing.createChart(anchorType);
            typeChart.setTitleText("Territoires par type");
            typeChart.setTitleOverlay(false);

            XDDFCategoryAxis bottomAxis = typeChart.createCategoryAxis(AxisPosition.BOTTOM);
            XDDFValueAxis leftAxis = typeChart.createValueAxis(AxisPosition.LEFT);
            leftAxis.setCrosses(AxisCrosses.AUTO_ZERO);

            XDDFDataSource<String> typeNames = XDDFDataSourcesFactory.fromStringCellRange(dataSheet, new CellRangeAddress(5, 5 + typeCount - 1, 0, 0));
            XDDFNumericalDataSource<Double> typeUsed = XDDFDataSourcesFactory.fromNumericCellRange(dataSheet, new CellRangeAddress(5, 5 + typeCount - 1, 1, 1));
            XDDFNumericalDataSource<Double> typeTotal = XDDFDataSourcesFactory.fromNumericCellRange(dataSheet, new CellRangeAddress(5, 5 + typeCount - 1, 2, 2));

            XDDFBarChartData barData = (XDDFBarChartData) typeChart.createData(ChartTypes.BAR, bottomAxis, leftAxis);
            barData.setBarDirection(BarDirection.COL);
            barData.setBarGrouping(BarGrouping.CLUSTERED);
            
            XDDFBarChartData.Series series1 = (XDDFBarChartData.Series) barData.addSeries(typeNames, typeUsed);
            series1.setTitle("Utilisés", null);
            
            XDDFBarChartData.Series series2 = (XDDFBarChartData.Series) barData.addSeries(typeNames, typeTotal);
            series2.setTitle("Total", null);

            typeChart.plot(barData);
        }

        // 3. Graphique par Ville (Bar Chart horizontal)
        int cityCount = statistics.getTotalTerritoriesByCity().size();
        if (cityCount > 0) {
            int startRowCity = 5 + typeCount + 2;
            XSSFClientAnchor anchorCity = drawing.createAnchor(0, 0, 0, 0, 0, 17, 15, 37);
            XSSFChart cityChart = drawing.createChart(anchorCity);
            cityChart.setTitleText("Territoires par ville");
            
            XDDFCategoryAxis cityAxis = cityChart.createCategoryAxis(AxisPosition.LEFT);
            XDDFValueAxis valueAxis = cityChart.createValueAxis(AxisPosition.BOTTOM);

            XDDFDataSource<String> cityNames = XDDFDataSourcesFactory.fromStringCellRange(dataSheet, new CellRangeAddress(startRowCity, startRowCity + cityCount - 1, 0, 0));
            XDDFNumericalDataSource<Double> cityUsed = XDDFDataSourcesFactory.fromNumericCellRange(dataSheet, new CellRangeAddress(startRowCity, startRowCity + cityCount - 1, 1, 1));
            XDDFNumericalDataSource<Double> cityTotal = XDDFDataSourcesFactory.fromNumericCellRange(dataSheet, new CellRangeAddress(startRowCity, startRowCity + cityCount - 1, 2, 2));

            XDDFBarChartData cityBarData = (XDDFBarChartData) cityChart.createData(ChartTypes.BAR, cityAxis, valueAxis);
            cityBarData.setBarDirection(BarDirection.BAR); // Horizontal
            cityBarData.setBarGrouping(BarGrouping.CLUSTERED);

            XDDFBarChartData.Series citySeries1 = (XDDFBarChartData.Series) cityBarData.addSeries(cityNames, cityUsed);
            citySeries1.setTitle("Utilisés", null);

            XDDFBarChartData.Series citySeries2 = (XDDFBarChartData.Series) cityBarData.addSeries(cityNames, cityTotal);
            citySeries2.setTitle("Total", null);

            cityChart.plot(cityBarData);
        }
    }
}
