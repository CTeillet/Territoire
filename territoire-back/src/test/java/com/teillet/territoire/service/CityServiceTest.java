package com.teillet.territoire.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.model.City;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.service.impl.CityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CityServiceTest {

	@Mock
	private CityRepository cityRepository;

	@Mock
	private com.teillet.territoire.repository.TerritoryRepository territoryRepository;

	@Mock
	private RestTemplate restTemplate;

	private ObjectMapper objectMapper;

	private CityService cityService;

	@BeforeEach
	void setUp() {
		objectMapper = new ObjectMapper();
		cityService = new CityService(cityRepository, territoryRepository, restTemplate, objectMapper);
	}

	@Test
	void testGetCity_Found() {
		UUID cityId = UUID.randomUUID();
		City city = new City();
		city.setId(cityId);
		city.setName("Paris");

		when(cityRepository.findById(cityId)).thenReturn(Optional.of(city));

		City result = cityService.getCity(cityId);
		assertNotNull(result);
		assertEquals("Paris", result.getName());
	}

	@Test
	void testGetCity_NotFound() {
		UUID cityId = UUID.randomUUID();
		when(cityRepository.findById(cityId)).thenReturn(Optional.empty());

		assertThrows(RuntimeException.class, () -> cityService.getCity(cityId));
	}

	@Test
	void testGetCities() {
		City city1 = new City();
		city1.setName("Paris");
		City city2 = new City();
		city2.setName("Lyon");

		when(cityRepository.findAll()).thenReturn(List.of(city1, city2));

		List<City> cities = cityService.getCities();
		assertEquals(2, cities.size());
	}

	@Test
	void testDeleteCity_WithTerritories_Refused() {
		UUID cityId = UUID.randomUUID();
		when(territoryRepository.existsByCity_Id(cityId)).thenReturn(true);

		assertThrows(IllegalStateException.class, () -> cityService.deleteCity(cityId));
		verify(cityRepository, never()).deleteById(any());
	}

	@Test
	void testDeleteCity() {
		UUID cityId = UUID.randomUUID();
		doNothing().when(cityRepository).deleteById(cityId);

		cityService.deleteCity(cityId);
		verify(cityRepository, times(1)).deleteById(cityId);
	}

	@Test
	void testUpdateCityColor_ValidHex() {
		UUID cityId = UUID.randomUUID();
		City city = new City();
		city.setId(cityId);
		city.setName("Paris");

		when(cityRepository.findById(cityId)).thenReturn(Optional.of(city));
		when(cityRepository.save(any(City.class))).thenAnswer(invocation -> invocation.getArgument(0));

		City updated = cityService.updateCityColor(cityId, "#3498db");
		assertEquals("#3498db", updated.getColorHex());
	}

	@Test
	void testUpdateCityColor_InvalidHex() {
		UUID cityId = UUID.randomUUID();
		City city = new City();
		city.setId(cityId);

		when(cityRepository.findById(cityId)).thenReturn(Optional.of(city));

		assertThrows(IllegalArgumentException.class, () -> cityService.updateCityColor(cityId, "invalid-hex"));
	}

	@Test
	void testUpdateCityColor_NullHex() {
		UUID cityId = UUID.randomUUID();
		City city = new City();
		city.setId(cityId);
		city.setColorHex("#ff0000");

		when(cityRepository.findById(cityId)).thenReturn(Optional.of(city));
		when(cityRepository.save(any(City.class))).thenAnswer(invocation -> invocation.getArgument(0));

		City updated = cityService.updateCityColor(cityId, null);
		assertNull(updated.getColorHex());
	}
}
