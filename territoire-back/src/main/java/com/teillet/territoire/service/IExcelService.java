package com.teillet.territoire.service;

import com.teillet.territoire.dto.exportExcel.CityExportDto;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

public interface IExcelService {
	void generateExcel(List<CityExportDto> cities, ByteArrayOutputStream outputStream, int startYear) throws IOException;
	byte[] exportExcel(Integer year) throws IOException;
	void importExcel(MultipartFile file) throws IOException;
}
