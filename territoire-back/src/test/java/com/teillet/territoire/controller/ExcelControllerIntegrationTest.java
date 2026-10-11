package com.teillet.territoire.controller;

import com.teillet.territoire.service.IExcelService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ExcelControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private IExcelService excelService;

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testExportExcel() throws Exception {
		when(excelService.exportExcel(2024)).thenReturn(new byte[]{1, 2, 3});

		mockMvc.perform(get("/api/excel").param("year", "2024"))
				.andExpect(status().isOk())
				.andExpect(content().bytes(new byte[]{1, 2, 3}));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testImportExcel() throws Exception {
		MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[]{1, 2, 3});

		doNothing().when(excelService).importExcel(any());

		mockMvc.perform(multipart("/api/excel").file(file))
				.andExpect(status().isOk())
				.andExpect(content().string("Import terminé avec succès"));

		verify(excelService).importExcel(any());
	}
}
