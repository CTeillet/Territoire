package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.CampaignDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Campaign;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.CampaignRepository;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.TerritoryRepository;
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
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private CampaignRepository campaignRepository;

	@Autowired
	private TerritoryRepository territoryRepository;

	@Autowired
	private CityRepository cityRepository;

	@Autowired
	private ObjectMapper objectMapper;

	private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
	private City city;

	@BeforeEach
	void setUp() {
		campaignRepository.deleteAll();
		territoryRepository.deleteAll();
		cityRepository.deleteAll();

		City c = new City();
		c.setName("Rennes");
		c.setZipCode("35000");
		c.setCenter(geometryFactory.createPoint(new Coordinate(-1.6777, 48.1173)));
		city = cityRepository.save(c);
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetAllCampaigns() throws Exception {
		Campaign c = new Campaign();
		c.setName("Campagne Ete");
		c.setStartDate(LocalDate.of(2024, 6, 1));
		c.setEndDate(LocalDate.of(2024, 8, 31));
		c.setTerritories(new ArrayList<>());
		c.setRemainingTerritories(new ArrayList<>());
		campaignRepository.save(c);

		mockMvc.perform(get("/api/campagnes"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("Campagne Ete"));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetCampaignById() throws Exception {
		Campaign c = new Campaign();
		c.setName("Campagne Unique");
		c.setStartDate(LocalDate.of(2024, 1, 1));
		c.setEndDate(LocalDate.of(2024, 6, 30));
		c.setTerritories(new ArrayList<>());
		c.setRemainingTerritories(new ArrayList<>());
		Campaign saved = campaignRepository.save(c);

		mockMvc.perform(get("/api/campagnes/{id}", saved.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Campagne Unique"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testCreateCampaign_Success() throws Exception {
		CampaignDto dto = CampaignDto.builder()
				.name("Nouvelle Campagne")
				.startDate(LocalDate.of(2024, 1, 1))
				.endDate(LocalDate.of(2024, 2, 1))
				.build();

		mockMvc.perform(post("/api/campagnes")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("Nouvelle Campagne"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testCreateCampaign_InvalidDates_ReturnsBadRequest() throws Exception {
		CampaignDto dto = CampaignDto.builder()
				.name("Campagne Invalide")
				.startDate(LocalDate.of(2024, 5, 1))
				.endDate(LocalDate.of(2024, 4, 1))
				.build();

		mockMvc.perform(post("/api/campagnes")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dto)))
				.andExpect(status().isBadRequest());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testCreateCampaignWithRemainingTerritories() throws Exception {
		Territory t = new Territory();
		t.setName("Territoire Restant");
		t.setCity(city);
		t.setStatus(TerritoryStatus.AVAILABLE);
		t.setType(TerritoryType.HOUSE);
		Territory savedTerritory = territoryRepository.save(t);

		Campaign prev = new Campaign();
		prev.setName("Campagne Prec");
		prev.setStartDate(LocalDate.of(2024, 1, 1));
		prev.setEndDate(LocalDate.of(2024, 3, 31));
		prev.setTerritories(new ArrayList<>(List.of(savedTerritory)));
		prev.setRemainingTerritories(new ArrayList<>(List.of(savedTerritory)));
		prev.setClosed(true);
		Campaign savedPrev = campaignRepository.save(prev);

		CampaignDto newCampaignDto = CampaignDto.builder()
				.name("Campagne Suivante")
				.startDate(LocalDate.of(2024, 4, 1))
				.endDate(LocalDate.of(2024, 6, 30))
				.build();

		mockMvc.perform(post("/api/campagnes/avec-territoires-restants/{previousCampaignId}", savedPrev.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(newCampaignDto)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("Campagne Suivante"));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetAndUpdateRemainingTerritories() throws Exception {
		Territory t = new Territory();
		t.setName("Territoire X");
		t.setCity(city);
		t.setStatus(TerritoryStatus.AVAILABLE);
		t.setType(TerritoryType.HOUSE);
		Territory savedTerritory = territoryRepository.save(t);

		Campaign c = new Campaign();
		c.setName("Campagne Terr Restants");
		c.setStartDate(LocalDate.of(2024, 1, 1));
		c.setEndDate(LocalDate.of(2024, 12, 31));
		c.setTerritories(new ArrayList<>(List.of(savedTerritory)));
		c.setRemainingTerritories(new ArrayList<>(List.of(savedTerritory)));
		Campaign saved = campaignRepository.save(c);

		// GET
		mockMvc.perform(get("/api/campagnes/{id}/territoires-restants", saved.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("Territoire X"));

		// PUT
		List<SimplifiedTerritoryDto> updateList = List.of(
				SimplifiedTerritoryDto.builder()
						.territoryId(savedTerritory.getId())
						.name("Territoire X")
						.cityName(city.getName())
						.build()
		);

		mockMvc.perform(put("/api/campagnes/{id}/territoires-restants", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(updateList)))
				.andExpect(status().isOk());
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetCampaignStatisticsAndGeoJsonAndExcel() throws Exception {
		Territory t = new Territory();
		t.setName("Territoire Stats");
		t.setCity(city);
		t.setStatus(TerritoryStatus.AVAILABLE);
		t.setType(TerritoryType.HOUSE);
		Territory savedTerritory = territoryRepository.save(t);

		Campaign c = new Campaign();
		c.setName("Campagne Stats");
		c.setStartDate(LocalDate.of(2024, 1, 1));
		c.setEndDate(LocalDate.of(2024, 12, 31));
		c.setTerritories(new ArrayList<>(List.of(savedTerritory)));
		c.setRemainingTerritories(new ArrayList<>());
		Campaign saved = campaignRepository.save(c);

		// Stats
		mockMvc.perform(get("/api/campagnes/{id}/statistiques", saved.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.campaignName").value("Campagne Stats"));

		// GeoJson
		mockMvc.perform(get("/api/campagnes/{id}/geojson", saved.getId()))
				.andExpect(status().isOk());

		// Excel Export
		mockMvc.perform(get("/api/campagnes/{id}/export/excel", saved.getId()))
				.andExpect(status().isOk())
				.andExpect(header().exists("Content-Disposition"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testCloseCampaign() throws Exception {
		Campaign c = new Campaign();
		c.setName("Campagne Ouverte");
		c.setStartDate(LocalDate.of(2024, 1, 1));
		c.setEndDate(LocalDate.of(2024, 12, 31));
		c.setClosed(false);
		c.setTerritories(new ArrayList<>());
		c.setRemainingTerritories(new ArrayList<>());
		Campaign saved = campaignRepository.save(c);

		mockMvc.perform(put("/api/campagnes/{id}/fermer", saved.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.closed").value(true));

		Campaign closed = campaignRepository.findById(saved.getId()).orElseThrow();
		assertTrue(closed.isClosed());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testDeleteCampaign_NotClosed() throws Exception {
		Campaign c = new Campaign();
		c.setName("Campagne A Supprimer");
		c.setStartDate(LocalDate.of(2024, 1, 1));
		c.setEndDate(LocalDate.of(2024, 12, 31));
		c.setClosed(false);
		c.setTerritories(new ArrayList<>());
		c.setRemainingTerritories(new ArrayList<>());
		Campaign saved = campaignRepository.save(c);

		mockMvc.perform(delete("/api/campagnes/{id}", saved.getId()))
				.andExpect(status().isNoContent());

		assertFalse(campaignRepository.findById(saved.getId()).isPresent());
	}
}
