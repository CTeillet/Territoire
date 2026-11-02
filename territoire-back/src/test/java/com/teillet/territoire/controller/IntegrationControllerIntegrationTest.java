package com.teillet.territoire.controller;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "integrations.api-key=" + IntegrationControllerIntegrationTest.API_KEY)
class IntegrationControllerIntegrationTest {
	static final String API_KEY = "cle-de-test-des-integrations-0123456789";
	private static final String URL = "/api/integrations/resume";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TerritoryRepository territoryRepository;

	@Autowired
	private CityRepository cityRepository;

	private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

	@BeforeEach
	void setUp() {
		cleanUp();
		City city = new City();
		city.setName("Rennes");
		city.setZipCode("35000");
		city.setCenter(geometryFactory.createPoint(new Coordinate(-1.6777, 48.1173)));
		city = cityRepository.save(city);

		territory("T1", TerritoryStatus.LATE, city);
		territory("T2", TerritoryStatus.LATE, city);
		territory("T3", TerritoryStatus.ASSIGNED, city);
		territory("T4", TerritoryStatus.AVAILABLE, city);
		territory("T5", TerritoryStatus.AVAILABLE, city);
		territory("T6", TerritoryStatus.AVAILABLE, city);
	}

	/** La base H2 est partagée par tous les contextes Spring des tests. */
	@AfterEach
	void tearDown() {
		cleanUp();
	}

	private void cleanUp() {
		territoryRepository.deleteAll();
		cityRepository.deleteAll();
	}

	private void territory(String name, TerritoryStatus status, City city) {
		Territory t = new Territory();
		t.setName(name);
		t.setCity(city);
		t.setStatus(status);
		t.setType(TerritoryType.HOUSE);
		t.setLastModifiedDate(LocalDate.now());
		territoryRepository.save(t);
	}

	@Test
	void testSummary_ValidKey_CountsByStatus() throws Exception {
		mockMvc.perform(get(URL).header("X-API-Key", API_KEY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.late").value(2))
				.andExpect(jsonPath("$.assigned").value(1))
				.andExpect(jsonPath("$.available").value(3))
				// Aucun territoire en attente : le compteur vaut 0 (et non absent)
				.andExpect(jsonPath("$.pending").value(0))
				.andExpect(jsonPath("$.total").value(6))
				// Uniquement des compteurs : aucune donnée sur les territoires ou les personnes
				.andExpect(jsonPath("$.length()").value(5));
	}

	@Test
	void testSummary_NoKey_Unauthorized() throws Exception {
		mockMvc.perform(get(URL))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void testSummary_WrongKey_Unauthorized() throws Exception {
		mockMvc.perform(get(URL).header("X-API-Key", API_KEY + "x"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void testOtherEndpoint_ValidKey_Unauthorized() throws Exception {
		// La clé n'ouvre que /api/integrations/**
		mockMvc.perform(get("/api/territoires").header("X-API-Key", API_KEY))
				.andExpect(status().isUnauthorized());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testSummary_LoggedInUserWithoutKey_Forbidden() throws Exception {
		mockMvc.perform(get(URL))
				.andExpect(status().isForbidden());
	}
}
