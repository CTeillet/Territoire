package com.teillet.territoire.service;

import com.teillet.territoire.model.City;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

public interface IExcelService {
	void generateExcel(List<City> cities, ByteArrayOutputStream outputStream) throws IOException;
	void importExcel(MultipartFile file) throws IOException;
}
