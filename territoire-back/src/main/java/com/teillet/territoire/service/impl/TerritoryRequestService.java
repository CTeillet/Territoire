package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.AvailableTerritoryDto;
import com.teillet.territoire.dto.CreateTerritoryRequestDto;
import com.teillet.territoire.dto.PublicAccessDto;
import com.teillet.territoire.dto.TerritoryRequestDto;
import com.teillet.territoire.event.TerritoryRequestedEvent;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.model.TerritoryRequest;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.TerritoryRequestRepository;
import com.teillet.territoire.service.ISettingService;
import com.teillet.territoire.service.ITerritoryRequestService;
import com.teillet.territoire.service.IWahaClient;
import com.teillet.territoire.utils.Utils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.teillet.territoire.enums.TerritoryRequestStatus.*;

@Slf4j
@Service
public class TerritoryRequestService implements ITerritoryRequestService {
	/** Limite les notifications au responsable si une personne enchaîne demandes et annulations. */
	static final int MAX_REQUESTS_PER_DAY = 3;

	private final TerritoryRequestRepository requestRepository;
	private final CityRepository cityRepository;
	private final TerritoryRepository territoryRepository;
	private final AssignmentRepository assignmentRepository;
	private final ISettingService settingService;
	private final IWahaClient wahaClient;
	private final ApplicationEventPublisher eventPublisher;
	private final String appUrl;
	private final Clock clock;

	public TerritoryRequestService(TerritoryRequestRepository requestRepository,
	                               CityRepository cityRepository,
	                               TerritoryRepository territoryRepository,
	                               AssignmentRepository assignmentRepository,
	                               ISettingService settingService,
	                               IWahaClient wahaClient,
	                               ApplicationEventPublisher eventPublisher,
	                               @Value("${territoire.app-url:}") String appUrl,
	                               Clock clock) {
		this.requestRepository = requestRepository;
		this.cityRepository = cityRepository;
		this.territoryRepository = territoryRepository;
		this.assignmentRepository = assignmentRepository;
		this.settingService = settingService;
		this.wahaClient = wahaClient;
		this.eventPublisher = eventPublisher;
		this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
		this.clock = clock;
	}

	// ---------------------------------------------------------------- Responsables

	@Override
	@Transactional(readOnly = true)
	public List<TerritoryRequestDto> getRequests(boolean includeClosed) {
		List<TerritoryRequest> requests = new ArrayList<>(requestRepository.findByStatusOrderByCreatedAtAsc(EN_ATTENTE));
		if (includeClosed) {
			requestRepository.findAllByOrderByCreatedAtDesc().stream()
					.filter(request -> request.getStatus() != EN_ATTENTE)
					.forEach(requests::add);
		}
		Map<UUID, Long> runningCounts = assignmentRepository.countRunningAssignmentsByPerson().stream()
				.collect(Collectors.toMap(row -> (UUID) row[0], row -> ((Number) row[1]).longValue()));
		Map<UUID, String> territoryNames = territoryNames(requests);
		return requests.stream()
				.map(request -> toDto(request, runningCounts.getOrDefault(request.getPerson().getId(), 0L).intValue(), territoryNames))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public long countPending() {
		return requestRepository.countByStatus(EN_ATTENTE);
	}

	@Override
	@Transactional
	public TerritoryRequestDto close(UUID requestId) {
		TerritoryRequest request = getRequest(requestId);
		if (request.getStatus() != EN_ATTENTE) {
			throw new IllegalStateException("Cette demande a déjà été traitée");
		}
		request.setStatus(CLOTUREE);
		request.setClosedAt(clock.instant());
		log.info("Demande de territoire {} clôturée", requestId);
		UUID personId = request.getPerson().getId();
		return toDto(requestRepository.save(request), assignmentRepository.findByPerson_IdAndReturnDateIsNull(personId).size(), Map.of());
	}

	@Override
	@Transactional(readOnly = true)
	public List<AvailableTerritoryDto> getAvailableTerritories(UUID requestId) {
		TerritoryRequest request = getRequest(requestId);
		List<AvailableTerritoryDto> territories = request.getCity() != null
				? territoryRepository.findAvailableInCity(request.getCity().getId())
				: territoryRepository.findAvailable();
		return territories.stream()
				.sorted(Comparator.comparing(AvailableTerritoryDto::lastReturnDate, Comparator.nullsFirst(Comparator.naturalOrder()))
						.thenComparing(AvailableTerritoryDto::name, String.CASE_INSENSITIVE_ORDER))
				.toList();
	}

	@Override
	@Transactional
	public void markAssigned(UUID personId, UUID territoryId) {
		List<TerritoryRequest> pending = requestRepository.findByPerson_IdAndStatus(personId, EN_ATTENTE);
		if (pending.isEmpty()) {
			return;
		}
		Instant now = clock.instant();
		pending.forEach(request -> {
			request.setStatus(ATTRIBUEE);
			request.setTerritory(territoryRepository.getReferenceById(territoryId));
			request.setClosedAt(now);
		});
		requestRepository.saveAll(pending);
		log.info("Demande de territoire de la personne {} satisfaite par l'attribution du territoire {}", personId, territoryId);
	}

	@Override
	@Transactional(readOnly = true)
	public void notifyNewRequest(UUID requestId) {
		try {
			String phone = settingService.getAccessSettings().getTerritoryRequestPhone();
			if (phone == null || phone.isBlank()) {
				return;
			}
			TerritoryRequest request = requestRepository.findById(requestId).orElse(null);
			if (request == null || request.getStatus() != EN_ATTENTE) {
				return;
			}
			Person person = request.getPerson();
			StringBuilder message = new StringBuilder()
					.append("Nouvelle demande de territoire de ").append(Utils.formatName(person.getFirstName(), person.getLastName()))
					.append("\nVille : ").append(request.getCity() != null ? request.getCity().getName() : "pas de préférence")
					.append("\nTerritoires en cours : ").append(assignmentRepository.findByPerson_IdAndReturnDateIsNull(person.getId()).size());
			if (request.getComment() != null) {
				message.append("\nCommentaire : ").append(request.getComment());
			}
			if (!appUrl.isBlank()) {
				message.append("\n\nPour y répondre : ").append(appUrl).append("/demandes");
			}
			wahaClient.sendMessage(phone, message.toString());
			log.info("Responsable prévenu de la demande de territoire {}", requestId);
		} catch (RuntimeException e) {
			log.error("Échec de l'envoi de la notification de demande de territoire {}", requestId, e);
		}
	}

	// ---------------------------------------------------------------- Lien personnel

	@Override
	@Transactional(readOnly = true)
	public List<PublicAccessDto.PublicCityDto> getRequestableCities() {
		return cityRepository.findWithTerritories().stream()
				.map(city -> PublicAccessDto.PublicCityDto.builder().id(city.getId()).name(city.getName()).build())
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public PublicAccessDto.PublicTerritoryRequestDto getPendingRequest(UUID personId) {
		return requestRepository.findFirstByPerson_IdAndStatus(personId, EN_ATTENTE)
				.map(request -> PublicAccessDto.PublicTerritoryRequestDto.builder()
						.id(request.getId())
						.cityName(request.getCity() != null ? request.getCity().getName() : null)
						.comment(request.getComment())
						.createdAt(request.getCreatedAt())
						.build())
				.orElse(null);
	}

	@Override
	@Transactional
	public void create(Person person, CreateTerritoryRequestDto dto) {
		if (requestRepository.findFirstByPerson_IdAndStatus(person.getId(), EN_ATTENTE).isPresent()) {
			throw new IllegalStateException("Tu as déjà une demande en attente. Annule-la si tu veux la modifier.");
		}
		Instant now = clock.instant();
		if (requestRepository.countByPerson_IdAndCreatedAtAfter(person.getId(), now.minus(Duration.ofDays(1))) >= MAX_REQUESTS_PER_DAY) {
			throw new IllegalStateException("Tu as déjà fait plusieurs demandes aujourd'hui : réessaie demain.");
		}
		City city = dto.getCityId() == null ? null : cityRepository.findById(dto.getCityId())
				.orElseThrow(() -> new IllegalArgumentException("Cette ville n'existe pas"));
		String comment = dto.getComment() == null || dto.getComment().isBlank() ? null : dto.getComment().trim();

		TerritoryRequest saved = requestRepository.save(TerritoryRequest.builder()
				.person(person)
				.city(city)
				.comment(comment)
				.status(EN_ATTENTE)
				.createdAt(now)
				.build());
		log.info("Demande de territoire {} créée par la personne {}", saved.getId(), person.getId());
		// Message WhatsApp au responsable envoyé après validation (cf. TerritoryRequestListener)
		eventPublisher.publishEvent(new TerritoryRequestedEvent(saved.getId()));
	}

	@Override
	@Transactional
	public void cancel(UUID personId, UUID requestId) {
		TerritoryRequest request = requestRepository.findById(requestId)
				.filter(r -> r.getPerson().getId().equals(personId))
				.orElseThrow(() -> new NotFoundException("Cette demande n'existe pas"));
		if (request.getStatus() != EN_ATTENTE) {
			throw new IllegalStateException("Cette demande a déjà été traitée.");
		}
		request.setStatus(ANNULEE);
		request.setClosedAt(clock.instant());
		requestRepository.save(request);
		log.info("Demande de territoire {} annulée par la personne {}", requestId, personId);
	}

	// ---------------------------------------------------------------- Interne

	private TerritoryRequest getRequest(UUID requestId) {
		return requestRepository.findById(requestId)
				.orElseThrow(() -> new NotFoundException("Demande introuvable"));
	}

	/** Noms des territoires attribués, en une requête légère (le proxy LAZY donne l'id sans charger le territoire). */
	private Map<UUID, String> territoryNames(List<TerritoryRequest> requests) {
		List<UUID> ids = requests.stream()
				.map(TerritoryRequest::getTerritory)
				.filter(Objects::nonNull)
				.map(Territory::getId)
				.distinct()
				.toList();
		if (ids.isEmpty()) {
			return Map.of();
		}
		return territoryRepository.findNamesByIds(ids).stream()
				.collect(Collectors.toMap(row -> (UUID) row[0], row -> (String) row[1]));
	}

	private static TerritoryRequestDto toDto(TerritoryRequest request, int activeTerritories, Map<UUID, String> territoryNames) {
		Person person = request.getPerson();
		UUID territoryId = request.getTerritory() != null ? request.getTerritory().getId() : null;
		return TerritoryRequestDto.builder()
				.id(request.getId())
				.personId(person.getId())
				.personName(Utils.formatName(person.getFirstName(), person.getLastName()))
				.cityId(request.getCity() != null ? request.getCity().getId() : null)
				.cityName(request.getCity() != null ? request.getCity().getName() : null)
				.comment(request.getComment())
				.status(request.getStatus())
				.createdAt(request.getCreatedAt())
				.closedAt(request.getClosedAt())
				.territoryId(territoryId)
				.territoryName(territoryId != null ? territoryNames.get(territoryId) : null)
				.activeTerritories(activeTerritories)
				.build();
	}
}
