package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.dto.PersonAccessStatusDto;
import com.teillet.territoire.dto.PublicAccessDto;
import com.teillet.territoire.enums.AccessStatus;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.PersonAccess;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.PersonAccessRepository;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.security.AccessLinkTokens;
import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.IPersonAccessService;
import com.teillet.territoire.service.ISettingService;
import com.teillet.territoire.service.IWahaClient;
import com.teillet.territoire.utils.GeoJsonUtils;
import com.teillet.territoire.utils.MessageTemplateRenderer;
import com.teillet.territoire.utils.Utils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PersonAccessService implements IPersonAccessService {
	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
	/** Évite d'écrire en base à chaque ouverture de la page. */
	private static final Duration LAST_USED_RESOLUTION = Duration.ofHours(1);

	private final PersonAccessRepository accessRepository;
	private final PersonRepository personRepository;
	private final AssignmentRepository assignmentRepository;
	private final IAssignmentService assignmentService;
	private final ISettingService settingService;
	private final IWahaClient wahaClient;
	private final MessageTemplateRenderer templateRenderer;
	private final AccessLinkTokens tokens;
	private final String baseUrl;
	private final Clock clock;

	public PersonAccessService(PersonAccessRepository accessRepository,
	                           PersonRepository personRepository,
	                           AssignmentRepository assignmentRepository,
	                           @Lazy IAssignmentService assignmentService,
	                           ISettingService settingService,
	                           IWahaClient wahaClient,
	                           MessageTemplateRenderer templateRenderer,
	                           AccessLinkTokens tokens,
	                           @Value("${access-link.base-url}") String baseUrl,
	                           Clock clock) {
		this.accessRepository = accessRepository;
		this.personRepository = personRepository;
		this.assignmentRepository = assignmentRepository;
		this.assignmentService = assignmentService;
		this.settingService = settingService;
		this.wahaClient = wahaClient;
		this.templateRenderer = templateRenderer;
		this.tokens = tokens;
		this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
		this.clock = clock;
	}

	// ---------------------------------------------------------------- Gestion

	@Override
	@Transactional(readOnly = true)
	public List<PersonAccessStatusDto> getAllStatuses() {
		Map<UUID, PersonAccess> accesses = accessRepository.findAll().stream()
				.collect(Collectors.toMap(access -> access.getPerson().getId(), Function.identity()));
		Map<UUID, Long> runningCounts = assignmentRepository.countRunningAssignmentsByPerson().stream()
				.collect(Collectors.toMap(row -> (UUID) row[0], row -> ((Number) row[1]).longValue()));
		return personRepository.findAll().stream()
				.map(person -> toStatus(person, accesses.get(person.getId()),
						runningCounts.getOrDefault(person.getId(), 0L).intValue()))
				.sorted(Comparator.comparing(PersonAccessStatusDto::getPersonName, String.CASE_INSENSITIVE_ORDER))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public PersonAccessStatusDto getStatus(UUID personId) {
		Person person = getPerson(personId);
		return toStatus(person, accessRepository.findByPerson_Id(personId).orElse(null), countRunning(personId));
	}

	@Override
	@Transactional
	public PersonAccessStatusDto regenerate(UUID personId) {
		Person person = getPerson(personId);
		PersonAccess access = accessRepository.findByPerson_Id(personId)
				.map(existing -> {
					existing.setVersion(existing.getVersion() + 1);
					existing.setRevoked(false);
					existing.setCreatedAt(clock.instant());
					existing.setLastUsedAt(null);
					existing.setLastSentAt(null);
					return existing;
				})
				.orElseGet(() -> newAccess(person));
		log.info("Lien personnel (re)généré pour la personne {}", personId);
		return toStatus(person, accessRepository.save(access), countRunning(personId));
	}

	@Override
	@Transactional
	public PersonAccessStatusDto revoke(UUID personId) {
		Person person = getPerson(personId);
		PersonAccess access = accessRepository.findByPerson_Id(personId)
				.orElseThrow(() -> new IllegalStateException("Aucun lien à révoquer pour cette personne"));
		access.setVersion(access.getVersion() + 1);
		access.setRevoked(true);
		log.info("Lien personnel révoqué pour la personne {}", personId);
		return toStatus(person, accessRepository.save(access), countRunning(personId));
	}

	@Override
	@Transactional
	public PersonAccessStatusDto updateExpiration(UUID personId, LocalDate expiresAt) {
		Person person = getPerson(personId);
		PersonAccess access = accessRepository.findByPerson_Id(personId)
				.orElseThrow(() -> new IllegalStateException("Aucun lien pour cette personne : générez-le d'abord"));
		access.setExpiresAt(expiresAt);
		return toStatus(person, accessRepository.save(access), countRunning(personId));
	}

	@Override
	@Transactional
	public PersonAccessStatusDto sendLink(UUID personId) {
		Person person = getPerson(personId);
		requirePhone(person);
		PersonAccess access = accessRepository.findByPerson_Id(personId)
				.orElseGet(() -> accessRepository.save(newAccess(person)));
		AccessStatus status = statusOf(access);
		if (status != AccessStatus.ACTIF) {
			throw new IllegalStateException("Le lien est " + (status == AccessStatus.REVOQUE ? "révoqué" : "expiré")
					+ " : générez-en un nouveau avant de l'envoyer");
		}

		Map<String, Object> data = new HashMap<>();
		data.put("person", personData(person));
		data.put("link", linkOf(access));
		String message = templateRenderer.render(settingService.getAccessSettings().getAccessLinkMessage(), data);
		wahaClient.sendMessage(person.getPhoneNumber(), message);

		access.setLastSentAt(clock.instant());
		log.info("Lien personnel envoyé par WhatsApp à la personne {}", personId);
		return toStatus(person, accessRepository.save(access), countRunning(personId));
	}

	@Override
	@Transactional
	public void notifyAssignment(UUID assignmentId) {
		try {
			AccessSettingsDto settings = settingService.getAccessSettings();
			if (!settings.isAssignmentNotificationEnabled()) {
				return;
			}
			Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
			if (assignment == null || assignment.getPerson() == null || assignment.getReturnDate() != null) {
				return;
			}
			Person person = assignment.getPerson();
			if (person.getPhoneNumber() == null || person.getPhoneNumber().isBlank()) {
				log.info("Pas de message d'attribution : aucun numéro pour la personne {}", person.getId());
				return;
			}
			PersonAccess access = accessRepository.findByPerson_Id(person.getId())
					.orElseGet(() -> accessRepository.save(newAccess(person)));
			if (statusOf(access) != AccessStatus.ACTIF) {
				log.info("Pas de message d'attribution : lien inactif pour la personne {}", person.getId());
				return;
			}

			Territory territory = assignment.getTerritory();
			Map<String, Object> territoryData = new HashMap<>();
			territoryData.put("name", territory.getName());
			territoryData.put("city", territory.getCity() != null ? territory.getCity().getName() : "");
			territoryData.put("dueDate", assignment.getDueDate() != null ? assignment.getDueDate().format(DATE_FORMAT) : "");

			Map<String, Object> data = new HashMap<>();
			data.put("person", personData(person));
			data.put("territory", territoryData);
			data.put("link", linkOf(access));

			wahaClient.sendMessage(person.getPhoneNumber(), templateRenderer.render(settings.getAssignmentMessage(), data));
			access.setLastSentAt(clock.instant());
			accessRepository.save(access);
			log.info("Message d'attribution envoyé pour le territoire {} à la personne {}", territory.getName(), person.getId());
		} catch (RuntimeException e) {
			log.error("Échec de l'envoi du message d'attribution {}", assignmentId, e);
		}
	}

	@Override
	@Transactional
	public void deleteForPerson(UUID personId) {
		accessRepository.deleteByPerson_Id(personId);
	}

	// ---------------------------------------------------------------- Accès public

	@Override
	@Transactional
	public PublicAccessDto getPublicView(String token) {
		PersonAccess access = resolve(token);
		Instant now = clock.instant();
		if (access.getLastUsedAt() == null || access.getLastUsedAt().isBefore(now.minus(LAST_USED_RESOLUTION))) {
			access.setLastUsedAt(now);
			accessRepository.save(access);
		}
		return buildPublicView(access.getPerson());
	}

	@Override
	@Transactional
	public PublicAccessDto returnTerritory(String token, UUID territoryId) {
		PersonAccess access = resolve(token);
		assignmentService.returnTerritoryByPerson(territoryId, access.getPerson().getId());
		return buildPublicView(access.getPerson());
	}

	// ---------------------------------------------------------------- Interne

	private PersonAccess resolve(String token) {
		AccessLinkTokens.ParsedToken parsed = tokens.parse(token)
				.orElseThrow(PersonAccessService::invalidLink);
		PersonAccess access = accessRepository.findByPerson_Id(parsed.personId())
				.orElseThrow(PersonAccessService::invalidLink);
		if (access.getVersion() != parsed.version() || statusOf(access) != AccessStatus.ACTIF) {
			throw invalidLink();
		}
		return access;
	}

	private static NotFoundException invalidLink() {
		// Même réponse quel que soit le motif : on ne révèle pas si un lien a existé
		return new NotFoundException("Ce lien n'est pas ou plus valide. Demandez un nouveau lien à votre responsable.");
	}

	private PublicAccessDto buildPublicView(Person person) {
		LocalDate today = LocalDate.now(clock);
		List<PublicAccessDto.PublicTerritoryDto> territories = assignmentRepository.findByPerson_IdAndReturnDateIsNull(person.getId()).stream()
				.filter(assignment -> assignment.getTerritory() != null)
				.sorted(Comparator.comparing(Assignment::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
				.map(assignment -> toPublicTerritory(assignment, today))
				.toList();
		return PublicAccessDto.builder()
				.firstName(Utils.capitalize(person.getFirstName()))
				.territories(territories)
				.build();
	}

	private PublicAccessDto.PublicTerritoryDto toPublicTerritory(Assignment assignment, LocalDate today) {
		Territory territory = assignment.getTerritory();
		String geojson;
		try {
			geojson = GeoJsonUtils.convertToGeoJSON(territory.getBlocks(), territory.getConcaveHull());
		} catch (IOException e) {
			throw new IllegalStateException("Conversion GeoJSON impossible pour le territoire " + territory.getId(), e);
		}
		List<PublicAccessDto.PublicAddressDto> addresses = Optional.ofNullable(territory.getAddressesNotToDo()).orElse(List.of()).stream()
				.map(address -> PublicAccessDto.PublicAddressDto.builder()
						.number(address.getNumber())
						.street(address.getStreet())
						.zipCode(address.getZipCode())
						.city(address.getCity())
						.build())
				.toList();
		boolean late = territory.getStatus() == TerritoryStatus.LATE
				|| (assignment.getDueDate() != null && assignment.getDueDate().isBefore(today));
		return PublicAccessDto.PublicTerritoryDto.builder()
				.id(territory.getId())
				.name(territory.getName())
				.cityName(territory.getCity() != null ? territory.getCity().getName() : null)
				.type(territory.getType())
				.note(territory.getNote())
				.assignmentDate(assignment.getAssignmentDate())
				.dueDate(assignment.getDueDate())
				.late(late)
				.geojson(geojson)
				.addressesNotToDo(addresses)
				.build();
	}

	private PersonAccess newAccess(Person person) {
		return PersonAccess.builder()
				.person(person)
				.version(1)
				.revoked(false)
				.createdAt(clock.instant())
				.build();
	}

	private AccessStatus statusOf(PersonAccess access) {
		if (access == null) {
			return AccessStatus.AUCUN;
		}
		if (access.isRevoked()) {
			return AccessStatus.REVOQUE;
		}
		if (access.getExpiresAt() != null && access.getExpiresAt().isBefore(LocalDate.now(clock))) {
			return AccessStatus.EXPIRE;
		}
		return AccessStatus.ACTIF;
	}

	private String linkOf(PersonAccess access) {
		return baseUrl + tokens.generate(access.getPerson().getId(), access.getVersion());
	}

	private PersonAccessStatusDto toStatus(Person person, PersonAccess access, int activeTerritories) {
		AccessStatus status = statusOf(access);
		return PersonAccessStatusDto.builder()
				.personId(person.getId())
				.personName(Utils.formatName(person.getFirstName(), person.getLastName()))
				.hasPhone(person.getPhoneNumber() != null && !person.getPhoneNumber().isBlank())
				.status(status)
				.link(status == AccessStatus.ACTIF ? linkOf(access) : null)
				.expiresAt(access != null ? access.getExpiresAt() : null)
				.createdAt(access != null ? access.getCreatedAt() : null)
				.lastUsedAt(access != null ? access.getLastUsedAt() : null)
				.lastSentAt(access != null ? access.getLastSentAt() : null)
				.activeTerritories(activeTerritories)
				.build();
	}

	private int countRunning(UUID personId) {
		return assignmentRepository.findByPerson_IdAndReturnDateIsNull(personId).size();
	}

	private Person getPerson(UUID personId) {
		return personRepository.findById(personId)
				.orElseThrow(() -> new NotFoundException("Personne non trouvée"));
	}

	private static void requirePhone(Person person) {
		if (person.getPhoneNumber() == null || person.getPhoneNumber().isBlank()) {
			throw new IllegalStateException("Aucun numéro de téléphone pour cette personne : copiez le lien pour le transmettre");
		}
	}

	private static Map<String, Object> personData(Person person) {
		Map<String, Object> data = new HashMap<>();
		data.put("firstName", Utils.capitalize(person.getFirstName()));
		data.put("name", Utils.formatName(person.getFirstName(), person.getLastName()));
		return data;
	}
}
