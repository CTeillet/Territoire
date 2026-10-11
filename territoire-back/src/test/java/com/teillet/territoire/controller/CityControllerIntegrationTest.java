package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.AddCityDto;
import com.teillet.territoire.dto.UpdateCityColorDto;
import com.teillet.territoire.model.City;
import com.teillet.territoire.repository.CityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CityControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private CityRepository cityRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@MockitoBean
	private RestTemplate restTemplate;

	private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

	private City createTestCity(String name, String zipCode) {
		City city = new City();
		city.setName(name);
		city.setZipCode(zipCode);
		city.setCenter(geometryFactory.createPoint(new Coordinate(2.3522, 48.8566)));
		return city;
	}

	@BeforeEach
	void setUp() {
		cityRepository.deleteAll();
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetCities_Authenticated() throws Exception {
		cityRepository.save(createTestCity("Paris", "75001"));

		mockMvc.perform(get("/api/villes"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("Paris"));
	}

	@Test
	void testGetCities_Unauthenticated_ShouldBeForbiddenOrUnauthorized() throws Exception {
		mockMvc.perform(get("/api/villes"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testAddCity_Admin_Success() throws Exception {
		when(restTemplate.getForObject(anyString(), eq(String.class)))
				.thenReturn("[{\"centre\":{\"coordinates\":[-1.5536, 47.2184]}}]");

		AddCityDto dto = new AddCityDto();
		dto.setName("Nantes");
		dto.setZipCode("44000");

		mockMvc.perform(post("/api/villes")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Nantes"));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testAddCity_UserRole_Forbidden() throws Exception {
		AddCityDto dto = new AddCityDto();
		dto.setName("Nantes");
		dto.setZipCode("44000");

		mockMvc.perform(post("/api/villes")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isForbidden());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testUpdateCityColor() throws Exception {
		City saved = cityRepository.save(createTestCity("Lyon", "69001"));

		UpdateCityColorDto dto = new UpdateCityColorDto();
		dto.setColorHex("#e74c3c");

		mockMvc.perform(patch("/api/villes/{id}/couleur", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.colorHex").value("#e74c3c"));

		City updated = cityRepository.findById(saved.getId()).orElseThrow();
		assertEquals("#e74c3c", updated.getColorHex());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void testDeleteCity() throws Exception {
		City saved = cityRepository.save(createTestCity("Marseille", "13001"));

		mockMvc.perform(delete("/api/villes/{id}", saved.getId()))
				.andExpect(status().isOk());

		assertFalse(cityRepository.findById(saved.getId()).isPresent());
	}
}
