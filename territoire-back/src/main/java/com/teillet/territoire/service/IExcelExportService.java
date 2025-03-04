package com.teillet.territoire.service;

import com.teillet.territoire.model.City;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

public interface IExcelExportService {
	void generateExcel(List<City> cities, ByteArrayOutputStream outputStream) throws IOException;
}
