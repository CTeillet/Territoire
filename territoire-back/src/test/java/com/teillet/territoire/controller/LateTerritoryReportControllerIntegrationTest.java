package com.teillet.territoire.controller;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.*;
import com.teillet.territoire.repository.*;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static com.teillet.territoire.utils.MailTestUtils.newMessage;
import static com.teillet.territoire.utils.MailTestUtils.part;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.mail.host=smtp.exemple.fr")
class LateTerritoryReportControllerIntegrationTest {
	private static final String URL = "/api/settings/recapitulatif-retards";
	private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private SettingRepository settingRepository;

	@Autowired
	private TerritoryReminderRepository territoryReminderRepository;

	@Autowired
	private AssignmentRepository assignmentRepository;

	@Autowired
	private TerritoryRepository territoryRepository;

	@Autowired
	private PersonRepository personRepository;

	@Autowired
	private CityRepository cityRepository;

	@MockitoBean
	private JavaMailSender mailSender;

	private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
	private final LocalDate today = LocalDate.now();

	@BeforeEach
	void setUp() {
		territoryReminderRepository.deleteAll();
		assignmentRepository.deleteAll();
		territoryRepository.deleteAll();
		personRepository.deleteAll();
		cityRepository.deleteAll();
		settingRepository.deleteAll();
		settingRepository.save(Setting.builder().publishersCount(30).lateReportRecipients("a@b.fr").build());

		City city = new City();
		city.setName("Rennes");
		city.setZipCode("35000");
		city.setCenter(geometryFactory.createPoint(new Coordinate(-1.6777, 48.1173)));
		city = cityRepository.save(city);

		Person alice = personRepository.save(Person.builder().firstName("Alice").lastName("Martin").build());
		Person bruno = personRepository.save(Person.builder().firstName("Bruno").lastName("Durand").build());

		Territory late = territory("T1", TerritoryStatus.LATE, city);
		// Attribution précédente (rendue) et relance d'avant l'attribution en cours : à ignorer
		assignment(late, bruno, today.minusDays(400), today.minusDays(280), today.minusDays(300));
		reminder(late, bruno, today.minusDays(290));
		assignment(late, alice, today.minusDays(150), today.minusDays(30), null);
		reminder(late, alice, today.minusDays(20));
		reminder(late, alice, today.minusDays(10));

		Territory assigned = territory("T2", TerritoryStatus.ASSIGNED, city);
		assignment(assigned, bruno, today.minusDays(10), today.plusDays(110), null);
	}

	private Territory territory(String name, TerritoryStatus status, City city) {
		Territory t = new Territory();
		t.setName(name);
		t.setCity(city);
		t.setStatus(status);
		t.setType(TerritoryType.HOUSE);
		t.setLastModifiedDate(today);
		return territoryRepository.save(t);
	}

	private void assignment(Territory territory, Person person, LocalDate assignmentDate, LocalDate dueDate, LocalDate returnDate) {
		assignmentRepository.save(Assignment.builder()
				.territory(territory)
				.person(person)
				.assignmentDate(assignmentDate)
				.dueDate(dueDate)
				.returnDate(returnDate)
				.build());
	}

	private void reminder(Territory territory, Person person, LocalDate date) {
		territoryReminderRepository.save(TerritoryReminder.builder()
				.territories(List.of(territory))
				.person(person)
				.reminderDate(date)
				.build());
	}

	@Test
	@WithMockUser(roles = "SUPERVISEUR")
	void sendsTheLateTerritoriesNow() throws Exception {
		when(mailSender.createMimeMessage()).thenReturn(newMessage());

		mockMvc.perform(post(URL + "/envoi"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.lateTerritories").value(1))
				.andExpect(jsonPath("$.recipients[0]").value("a@b.fr"));

		ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
		verify(mailSender).send(captor.capture());
		MimeMessage message = captor.getValue();
		assertThat(message.getSubject()).isEqualTo("1 territoire en retard au " + DATE.format(today));
		assertThat(part(message, "text/plain"))
				.contains("- T1 (Rennes) : Alice Martin, échéance " + DATE.format(today.minusDays(30))
						+ ", retard 30 jours, dernière relance " + DATE.format(today.minusDays(10)) + "\n")
				.doesNotContain("T2")
				.doesNotContain("Bruno");
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void savesAndReadsTheRecipients() throws Exception {
		mockMvc.perform(put(URL)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"recipients\":[\"c@d.fr\",\"a@b.fr\",\"c@d.fr\"]}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.recipients.length()").value(2))
				.andExpect(jsonPath("$.recipients[0]").value("c@d.fr"))
				.andExpect(jsonPath("$.recipients[1]").value("a@b.fr"));

		mockMvc.perform(get(URL))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.recipients.length()").value(2))
				.andExpect(jsonPath("$.mailConfigured").value(true));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void rejectsAnInvalidAddress() throws Exception {
		mockMvc.perform(put(URL)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"recipients\":[\"pas-une-adresse\"]}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void refusesToSendWithoutRecipients() throws Exception {
		mockMvc.perform(put(URL)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"recipients\":[]}"))
				.andExpect(status().isOk());

		mockMvc.perform(post(URL + "/envoi"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.error").value("Aucun destinataire n'est enregistré pour le récapitulatif des retards"));
		verifyNoInteractions(mailSender);
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void isReservedToAdminsAndSupervisors() throws Exception {
		mockMvc.perform(get(URL)).andExpect(status().isForbidden());
		mockMvc.perform(put(URL)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"recipients\":[]}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(post(URL + "/envoi")).andExpect(status().isForbidden());
		verifyNoInteractions(mailSender);
	}
}
