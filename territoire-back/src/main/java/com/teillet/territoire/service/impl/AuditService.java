package com.teillet.territoire.service.impl;

import com.teillet.territoire.repository.UserRepository;
import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.enums.AuditAction;
import com.teillet.territoire.model.AuditEvent;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.repository.AuditEventRepository;
import com.teillet.territoire.repository.PersonRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.utils.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

/**
 * Journal des actions : qui a fait quoi, et quand. Appelé par les contrôleurs une fois l'action réussie ; l'auteur est
 * l'utilisateur connecté. Un journal impossible à écrire ne fait jamais échouer l'action (journalisé, sans plus).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {
	/** Lignes rendues au plus par une lecture du journal. */
	static final int MAX_EVENTS = 300;
	public static final String PUBLIC_LINK_ACTOR = "Lien personnel";

	private final AuditEventRepository repository;
	private final TerritoryRepository territoryRepository;
	private final PersonRepository personRepository;
	private final UserRepository userRepository;
	private final Clock clock;

	/** Action sur un territoire (création, modification, archivage, carte...). */
	public void territory(AuditAction action, UUID territoryId, String details) {
		record(currentActor(), action, territoryId, territoryName(territoryId), null, null, details);
	}

	/** Action sur un territoire dont le nom est lu avant (suppression). */
	public void territory(AuditAction action, UUID territoryId, String territoryName, String details) {
		record(currentActor(), action, territoryId, territoryName, null, null, details);
	}

	/** Action sur une attribution (attribution, retour, prolongation, annulation, dates). */
	public void assignment(AuditAction action, AssignmentDto assignment, String details) {
		assignment(currentActor(), action, assignment, details);
	}

	public void assignment(String actor, AuditAction action, AssignmentDto assignment, String details) {
		if (assignment == null) {
			return;
		}
		UUID territoryId = assignment.getTerritory() != null ? assignment.getTerritory().getTerritoryId() : null;
		String territoryName = assignment.getTerritory() != null ? assignment.getTerritory().getName() : null;
		Person person = assignment.getPerson();
		record(actor, action, territoryId, territoryName != null ? territoryName : territoryName(territoryId),
				person != null ? person.getId() : null, person != null ? nameOf(person) : null, details);
	}

	/** Action sur une personne. */
	public void person(AuditAction action, UUID personId, String details) {
		record(currentActor(), action, null, null, personId, personName(personId), details);
	}

	/** Action sur une personne dont le nom est lu avant (suppression). */
	public void person(AuditAction action, UUID personId, String personName, String details) {
		record(currentActor(), action, null, null, personId, personName, details);
	}

	/** Action sur un compte (création, rôle, mot de passe, suppression) : le compte visé est dans le détail. */
	public void account(AuditAction action, String details) {
		record(currentActor(), action, null, null, null, null, details);
	}

	/** E-mail d'un compte, pour le détail d'une action sur lui (lu avant une suppression). */
	public String accountEmail(UUID userId) {
		return userRepository.findById(userId).map(u -> u.getEmail()).orElse(String.valueOf(userId));
	}

	/** Personne anonymisée : son ancien nom disparaît aussi du journal. */
	@Transactional
	public void anonymize(UUID personId, String anonymizedName) {
		repository.renamePerson(personId, anonymizedName);
	}

	@Transactional(readOnly = true)
	public List<AuditEvent> latest(UUID territoryId, UUID personId) {
		PageRequest page = PageRequest.of(0, MAX_EVENTS);
		if (territoryId != null) {
			return repository.findByTerritoryIdOrderByOccurredAtDesc(territoryId, page);
		}
		if (personId != null) {
			return repository.findByPersonIdOrderByOccurredAtDesc(personId, page);
		}
		return repository.findAllByOrderByOccurredAtDesc(page);
	}

	/** Écrit dans sa propre transaction (save) : les contrôleurs l'appellent une fois l'action validée. */
	public void record(String actor, AuditAction action, UUID territoryId, String territoryName, UUID personId,
	                   String personName, String details) {
		try {
			repository.save(AuditEvent.builder()
					.occurredAt(clock.instant())
					.actor(actor)
					.action(action)
					.territoryId(territoryId)
					.territoryName(territoryName)
					.personId(personId)
					.personName(personName)
					.details(details)
					.build());
		} catch (RuntimeException e) {
			log.warn("Journal des actions : « {} » non enregistré ({})", action, e.getMessage());
		}
	}

	public String territoryName(UUID territoryId) {
		return territoryId == null ? null : territoryRepository.findById(territoryId).map(t -> t.getName()).orElse(null);
	}

	public String personName(UUID personId) {
		return personId == null ? null : personRepository.findById(personId).map(AuditService::nameOf).orElse(null);
	}

	private static String nameOf(Person person) {
		return Utils.formatName(person.getFirstName(), person.getLastName());
	}

	private static String currentActor() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication != null && authentication.getName() != null ? authentication.getName() : "inconnu";
	}
}
