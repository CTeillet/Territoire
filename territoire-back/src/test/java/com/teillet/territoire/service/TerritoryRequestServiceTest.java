package com.teillet.territoire.service;

import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.enums.TerritoryRequestStatus;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.TerritoryRequest;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.TerritoryRequestRepository;
import com.teillet.territoire.service.impl.TerritoryRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Cas limites du service des demandes de territoire (le parcours nominal est couvert par TerritoryRequestIntegrationTest).
 */
@ExtendWith(MockitoExtension.class)
class TerritoryRequestServiceTest {
	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-12T10:00:00Z"), ZoneId.of("Europe/Paris"));
	private static final String PHONE = "+33700000000";

	@Mock private TerritoryRequestRepository requestRepository;
	@Mock private CityRepository cityRepository;
	@Mock private TerritoryRepository territoryRepository;
	@Mock private AssignmentRepository assignmentRepository;
	@Mock private ISettingService settingService;
	@Mock private IWahaClient wahaClient;
	@Mock private ApplicationEventPublisher eventPublisher;

	private TerritoryRequest request;

	@BeforeEach
	void setUp() {
		Person person = Person.builder().id(UUID.randomUUID()).firstName("jean").lastName("dupont").build();
		request = TerritoryRequest.builder().id(UUID.randomUUID()).person(person)
				.status(TerritoryRequestStatus.EN_ATTENTE).createdAt(CLOCK.instant()).build();
	}

	private TerritoryRequestService service(String appUrl) {
		return new TerritoryRequestService(requestRepository, cityRepository, territoryRepository, assignmentRepository,
				settingService, wahaClient, eventPublisher, appUrl, CLOCK);
	}

	private void configurePhone(String phone) {
		when(settingService.getAccessSettings()).thenReturn(AccessSettingsDto.builder().territoryRequestPhone(phone).build());
	}

	@Test
	void notify_WithoutPhone_SendsNothing() {
		configurePhone(null);

		service("https://tms.example").notifyNewRequest(request.getId());

		verifyNoInteractions(wahaClient);
		verifyNoInteractions(requestRepository);
	}

	@Test
	void notify_RequestAlreadyCancelled_SendsNothing() {
		configurePhone(PHONE);
		request.setStatus(TerritoryRequestStatus.ANNULEE);
		when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));

		service("https://tms.example").notifyNewRequest(request.getId());

		verifyNoInteractions(wahaClient);
	}

	@Test
	void notify_WithoutAppUrl_NoLinkAndNoPreference() {
		configurePhone(PHONE);
		when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));

		service("").notifyNewRequest(request.getId());

		verify(wahaClient).sendMessage(eq(PHONE), argThat(message ->
				message.contains("Ville : pas de préférence") && !message.contains("Commentaire") && !message.contains("répondre")));
	}

	@Test
	void notify_WhatsAppFailure_IsSwallowed() {
		configurePhone(PHONE);
		when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));
		doThrow(new RuntimeException("WAHA indisponible")).when(wahaClient).sendMessage(anyString(), anyString());

		assertDoesNotThrow(() -> service("https://tms.example/").notifyNewRequest(request.getId()));
	}

	@Test
	void markAssigned_WithoutPendingRequest_DoesNothing() {
		UUID personId = request.getPerson().getId();
		when(requestRepository.findByPerson_IdAndStatus(personId, TerritoryRequestStatus.EN_ATTENTE)).thenReturn(List.of());

		service("").markAssigned(personId, UUID.randomUUID());

		verify(requestRepository, never()).saveAll(any());
		verifyNoInteractions(territoryRepository);
	}
}
