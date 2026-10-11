package com.teillet.territoire.controller;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.repository.TerritoryReminderRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.IWahaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TerritoryReminderControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TerritoryReminderRepository territoryReminderRepository;

	@Autowired
	private TerritoryRepository territoryRepository;

	@Autowired
	private PersonRepository personRepository;

	@Autowired
	private CityRepository cityRepository;

	@MockitoBean
	private IWahaClient wahaClient;

	private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
	private Territory territory;
	private Person person;

	@BeforeEach
	void setUp() {
		territoryReminderRepository.deleteAll();
		territoryRepository.deleteAll();
		personRepository.deleteAll();
		cityRepository.deleteAll();

		City c = new City();
		c.setName("Rennes");
		c.setZipCode("35000");
		c.setCenter(geometryFactory.createPoint(new Coordinate(-1.6777, 48.1173)));
		City savedCity = cityRepository.save(c);

		Territory t = new Territory();
		t.setName("Territoire 1");
		t.setCity(savedCity);
		t.setStatus(TerritoryStatus.LATE);
		t.setType(TerritoryType.HOUSE);
		t.setLastModifiedDate(LocalDate.now());
		territory = territoryRepository.save(t);

		person = personRepository.save(Person.builder()
				.firstName("Alice")
				.lastName("Martin")
				.phoneNumber("+33612345678")
				.build());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void testCreateReminder() throws Exception {
		mockMvc.perform(post("/api/territory-reminders")
						.param("territoryIds", territory.getId().toString())
						.param("personId", person.getId().toString())
						.param("notes", "Premier rappel"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.notes").value("Premier rappel"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testSendWhatsAppReminder() throws Exception {
		doNothing().when(wahaClient).sendMessage(anyString(), anyString());

		mockMvc.perform(post("/api/territory-reminders/whatsapp")
						.param("territoryIds", territory.getId().toString())
						.param("personId", person.getId().toString())
						.contentType(MediaType.TEXT_PLAIN)
						.content("N'oubliez pas votre territoire en retard"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.messageSend").value("N'oubliez pas votre territoire en retard"));
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetAllAndByTerritoryAndPersonAndCheck() throws Exception {
		// create a reminder directly in repository
		territoryReminderRepository.save(com.teillet.territoire.model.TerritoryReminder.builder()
				.territories(java.util.List.of(territory))
				.person(person)
				.reminderDate(LocalDate.now())
				.notes("Premier rappel")
				.build());

		mockMvc.perform(get("/api/territory-reminders"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].notes").value("Premier rappel"));

		mockMvc.perform(get("/api/territory-reminders/territory/{territoryId}", territory.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].notes").value("Premier rappel"));

		mockMvc.perform(get("/api/territory-reminders/person/{personId}", person.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].notes").value("Premier rappel"));

		mockMvc.perform(get("/api/territory-reminders/check")
						.param("territoryId", territory.getId().toString())
						.param("personId", person.getId().toString()))
				.andExpect(status().isOk())
				.andExpect(content().string("true"));
	}
}
