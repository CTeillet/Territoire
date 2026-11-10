package com.teillet.territoire.controller;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.TerritoryMapVersionRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Cartes précédentes : une carte remplacée est gardée, revue et remise ; la carte actuelle est gardée à son tour. */
@SpringBootTest
@AutoConfigureMockMvc
class TerritoryCardHistoryIntegrationTest {
	@Autowired private MockMvc mockMvc;
	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private TerritoryMapVersionRepository versionRepository;
	@Autowired private CityRepository cityRepository;

	private Territory territory;

	@BeforeEach
	void setUp() {
		cleanUp();
		City city = new City();
		city.setName("Rennes");
		city.setZipCode("35000");
		city.setCenter(new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-1.6777, 48.1173)));
		city = cityRepository.save(city);
		Territory t = new Territory();
		t.setName("T-Cartes");
		t.setCity(city);
		t.setStatus(TerritoryStatus.AVAILABLE);
		t.setType(TerritoryType.HOUSE);
		t.setLastModifiedDate(LocalDate.now());
		territory = territoryRepository.save(t);
	}

	/** Base partagée entre les classes de test : rien ne doit rester (cf. clés étrangères vers territory). */
	@AfterEach
	void cleanUp() {
		versionRepository.deleteAll();
		territoryRepository.deleteAll();
		cityRepository.deleteAll();
	}

	private void upload(String name, String bytes) throws Exception {
		mockMvc.perform(multipart("/api/territoires/{id}/carte", territory.getId())
						.file(new MockMultipartFile("file", name, "image/png", bytes.getBytes(StandardCharsets.UTF_8))))
				.andExpect(status().isOk());
	}

	private String currentCard() throws Exception {
		return text(mockMvc.perform(get("/api/territoires/{id}/carte", territory.getId()))
				.andReturn().getResponse().getContentAsByteArray());
	}

	/** Sous H2, la colonne de la carte actuelle (binary) complète l'image par des zéros ; pas en PostgreSQL. */
	private static String text(byte[] bytes) {
		return new String(bytes, StandardCharsets.UTF_8).replace("\0", "");
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void aReplacedCardIsKeptAndCanBeRestored() throws Exception {
		upload("scan.png", "carte-scannee");
		mockMvc.perform(get("/api/territoires/{id}/cartes-precedentes", territory.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));

		upload("generee.png", "carte-generee");

		String list = mockMvc.perform(get("/api/territoires/{id}/cartes-precedentes", territory.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].fileName").value("scan.png"))
				.andExpect(jsonPath("$[0].contentType").value("image/png"))
				.andExpect(jsonPath("$[0].replacedAt").exists())
				.andReturn().getResponse().getContentAsString();
		String versionId = JsonPath.read(list, "$[0].id");

		byte[] image = mockMvc.perform(get("/api/territoires/{id}/cartes-precedentes/{versionId}", territory.getId(), versionId))
				.andExpect(status().isOk())
				.andExpect(header().string("Content-Security-Policy", "default-src 'none'; sandbox"))
				.andReturn().getResponse().getContentAsByteArray();
		assertThat(text(image)).isEqualTo("carte-scannee");

		mockMvc.perform(post("/api/territoires/{id}/cartes-precedentes/{versionId}/restauration", territory.getId(), versionId))
				.andExpect(status().isNoContent());

		assertThat(currentCard()).isEqualTo("carte-scannee");
		// La carte générée n'est pas perdue : elle rejoint les cartes précédentes, la plus récente d'abord
		mockMvc.perform(get("/api/territoires/{id}/cartes-precedentes", territory.getId()))
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].fileName").value("generee.png"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void anUnknownOrForeignVersionIsNotFound() throws Exception {
		mockMvc.perform(get("/api/territoires/{id}/cartes-precedentes/{versionId}", territory.getId(),
						"00000000-0000-0000-0000-000000000000"))
				.andExpect(status().isNotFound());
		mockMvc.perform(post("/api/territoires/{id}/cartes-precedentes/{versionId}/restauration", territory.getId(),
						"00000000-0000-0000-0000-000000000000"))
				.andExpect(status().isNotFound());
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void reservedToThoseWhoManageCards() throws Exception {
		mockMvc.perform(get("/api/territoires/{id}/cartes-precedentes", territory.getId()))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/api/territoires/{id}/cartes-precedentes/{versionId}/restauration", territory.getId(),
						"00000000-0000-0000-0000-000000000000"))
				.andExpect(status().isForbidden());
	}
}
