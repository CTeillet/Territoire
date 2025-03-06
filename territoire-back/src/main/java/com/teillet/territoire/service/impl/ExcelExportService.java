package com.teillet.territoire.service.impl;

import com.teillet.territoire.designPattern.ExcelGenerator;
import com.teillet.territoire.model.City;
import com.teillet.territoire.service.IExcelExportService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExcelExportService implements IExcelExportService {

	@Override
	public void generateExcel(List<City> cities, ByteArrayOutputStream outputStream) throws IOException {
		try (Workbook workbook = new XSSFWorkbook()) {
			ExcelGenerator excelGenerator = new ExcelGenerator(workbook);
			excelGenerator.generate(cities);
			workbook.write(outputStream);
		}
	}
}
