package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.dto.UpdateAssignmentDatesDto;
import com.teillet.territoire.enums.ReturnSource;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.event.TerritoryAssignedEvent;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.mapper.AssignmentMapper;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Campaign;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.IPersonService;
import com.teillet.territoire.service.ITerritoryService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class AssignmentService implements IAssignmentService {
	private final AssignmentRepository assignmentRepository;
	private final ITerritoryService territoryService;
	private final IPersonService personService;
	private final ApplicationEventPublisher eventPublisher;

	public AssignmentService(
		AssignmentRepository assignmentRepository,
		@Lazy ITerritoryService territoryService,
		IPersonService personService,
		ApplicationEventPublisher eventPublisher
	) {
		this.assignmentRepository = assignmentRepository;
		this.territoryService = territoryService;
		this.personService = personService;
		this.eventPublisher = eventPublisher;
	}

	@Transactional
	@Override
	public AssignmentDto assignTerritory(UUID territoryId, UUID personId) {
		Person person = personService.getPerson(personId);
		// @Version sur Territory : si deux attributions simultanées modifient le même territoire, la seconde est refusée (409)
		Territory territory = territoryService.getTerritory(territoryId);
		if (territory.getStatus() != TerritoryStatus.AVAILABLE) {
			throw new IllegalStateException("Territory is not available");
		}

		Assignment assignment = Assignment.builder()
				.territory(territory)
				.person(person)
				.assignmentDate(LocalDate.now())
				.dueDate(LocalDate.now().plusMonths(4))
				.build();

		territoryService.updateTerritoryStatus(territory, TerritoryStatus.ASSIGNED);
		Assignment saved = assignmentRepository.save(assignment);
		// Message WhatsApp éventuel envoyé après validation de la transaction (cf. AssignmentNotificationListener)
		eventPublisher.publishEvent(new TerritoryAssignedEvent(saved.getId(), personId, territoryId));
		return AssignmentMapper.toDto(saved);
	}

	@Transactional
	@Override
	public AssignmentDto returnTerritory(UUID territoryId) {
		// Récupérer l'assignation en cours pour ce territoire
		Assignment assignment = findAssignmentRunning(territoryId);
		return completeReturn(assignment, ReturnSource.RESPONSABLE);
	}

	@Transactional
	@Override
	public AssignmentDto returnTerritoryByPerson(UUID territoryId, UUID personId) {
		Assignment assignment = assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId)
				.filter(running -> running.getPerson() != null && personId.equals(running.getPerson().getId()))
				.orElseThrow(() -> new NotFoundException("Ce territoire ne vous est pas attribué"));
		log.info("Territoire {} rendu par la personne {} depuis son lien", territoryId, personId);
		return completeReturn(assignment, ReturnSource.LIEN);
	}

	private AssignmentDto completeReturn(Assignment assignment, ReturnSource source) {
		assignment.setReturnDate(LocalDate.now());
		assignment.setReturnedVia(source);
		assignmentRepository.save(assignment);
		territoryService.updateTerritoryStatus(assignment.getTerritory(), TerritoryStatus.PENDING);
		Assignment resultAssignment = getAssignment(assignment.getId());
		return AssignmentMapper.toDto(resultAssignment);
	}

	private Assignment findAssignmentRunning(UUID territoryId) {
		return assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId)
				.orElseThrow(() -> new EntityNotFoundException("Aucune assignation active trouvée pour ce territoire"));
	}

	/**
	 * Passe en retard les territoires dont l'attribution a dépassé son échéance.
	 * Exécuté chaque nuit par {@link com.teillet.territoire.scheduling.NightlyJobs} (et à la demande).
	 * Une attribution en erreur n'empêche pas le traitement des suivantes.
	 */
	@Override
	public void checkOverdueAssignments() {
		List<Assignment> overdueAssignments = assignmentRepository.findByDueDateBeforeAndReturnDateIsNull(LocalDate.now());
		int updated = 0;
		for (Assignment assignment : overdueAssignments) {
			try {
				Territory territory = assignment.getTerritory();
				if (territory == null || territory.getStatus() == TerritoryStatus.LATE) {
					continue;
				}
				log.info("Territoire {} est en retard", territory.getName());
				// updateTerritoryStatus ne modifie pas lastModifiedDate (contrairement à saveTerritory)
				territoryService.updateTerritoryStatus(territory, TerritoryStatus.LATE);
				updated++;
			} catch (Exception e) {
				log.error("Impossible de passer en retard l'attribution {}", assignment.getId(), e);
			}
		}
		log.info("Vérification des retards terminée : {} territoire(s) passé(s) en retard", updated);
	}

	@Override
	public Assignment getAssignment(UUID assignmentId) {
		return assignmentRepository.findById(assignmentId)
				.orElseThrow(() -> new NotFoundException("Attribution introuvable"));
	}

	@Override
	public List<AssignmentDto> getLastAssignments() {
		log.debug("Début de récupération des dernières attributions");

		List<Assignment> assignments = assignmentRepository.findAssignmentsByAssignmentDateAfterOrReturnDateAfter(LocalDate.now().minusDays(7), LocalDate.now().minusDays(7));

		log.debug("Attributions récupérées : {}", assignments.size());

		List<AssignmentDto> assignmentDtos = assignments.stream()
				.map(AssignmentMapper::toDto)
				.toList();

		log.info("Conversion en DTO terminée : {} résultats", assignmentDtos.size());
		return assignmentDtos;
	}

	@Override
	public List<AssignmentDto> getAssignmentsInPeriod(LocalDate startDate, LocalDate endDate) {
		log.debug("Début de récupération des attributions dans la période {} - {}", startDate, endDate);

		List<Assignment> assignments = assignmentRepository.findAssignmentsInPeriod(startDate, endDate);

		log.debug("Attributions récupérées pour la période : {}", assignments.size());

		return assignments.stream()
				.map(AssignmentMapper::toDto)
				.toList();
	}

	@Override
	public AssignmentDto extendTerritory(UUID territoryId) {
		// Default extension is 4 months
		return extendTerritory(territoryId, LocalDate.now().plusMonths(4));
	}

	@Override
	public AssignmentDto extendTerritory(UUID territoryId, LocalDate dueDate) {
		Assignment assignment = findAssignmentRunning(territoryId);

		// Instead of creating a new assignment, update the due date of the existing one
		assignment.setDueDate(dueDate);
		Assignment result = assignmentRepository.save(assignment);

		return AssignmentMapper.toDto(result);
	}

	@Transactional
	@Override
	public AssignmentDto cancelAssignment(UUID territoryId) {
		// Récupérer l'assignation en cours pour ce territoire
		Assignment assignment = findAssignmentRunning(territoryId);

		// Créer une copie de l'assignation pour le retour (car on va supprimer l'originale)
		AssignmentDto assignmentDto = AssignmentMapper.toDto(assignment);

		// Mettre à jour le statut du territoire à AVAILABLE
		territoryService.updateTerritoryStatus(assignment.getTerritory(), TerritoryStatus.AVAILABLE);

		// Supprimer l'assignation
		assignmentRepository.delete(assignment);

		log.info("Assignation du territoire {} annulée et supprimée", territoryId);

		return assignmentDto;
	}

	@Override
	@Transactional
	public void createCampaignAssignments(Campaign campaign, List<Territory> usedTerritories) {
		log.info("Création des assignations pour {} territoires utilisés dans la campagne '{}'", 
				usedTerritories.size(), campaign.getName());

		for (Territory territory : usedTerritories) {
			log.info("Création d'une assignation pour le territoire '{}' dans la campagne '{}'", 
					territory.getName(), campaign.getName());

			Assignment assignment = Assignment.builder()
					.territory(territory)
					.campaign(campaign)
					.dueDate(campaign.getEndDate())
					.assignmentDate(campaign.getStartDate())
					.returnDate(campaign.getEndDate())
					.build();

			assignmentRepository.save(assignment);

			// Parcouru pendant la campagne : mêmes règles qu'un retour habituel (en attente 4 mois).
			// Un territoire attribué ou en retard garde son statut : il est encore chez quelqu'un.
			if (territory.getStatus() == TerritoryStatus.AVAILABLE) {
				territoryService.updateTerritoryStatus(territory, TerritoryStatus.PENDING);
			}
			log.info("Assignation créée avec succès pour le territoire '{}'", territory.getName());
		}
	}

	@Override
	public List<AssignmentDto> getAssignmentsByPersonId(UUID personId) {
		log.info("Récupération des assignations pour la personne avec l'ID: {}", personId);

		List<Assignment> assignments = assignmentRepository.findByPerson_Id(personId);

		log.info("Nombre d'assignations trouvées: {}", assignments.size());

		return assignments.stream()
				.map(AssignmentMapper::toDto)
				.toList();
	}

	@Override
	@Transactional
	public AssignmentDto updateAssignmentDates(UUID assignmentId, UpdateAssignmentDatesDto dates) {
		Assignment assignment = getAssignment(assignmentId);
		validateDates(assignment, dates);

		assignment.setAssignmentDate(dates.getAssignmentDate());
		assignment.setDueDate(dates.getDueDate());
		assignment.setReturnDate(dates.getReturnDate());
		Assignment result = assignmentRepository.save(assignment);
		log.info("Dates de l'attribution modifiées : {}", result);

		refreshTerritoryStatus(result.getTerritory());
		return AssignmentMapper.toDto(result);
	}

	private static void validateDates(Assignment assignment, UpdateAssignmentDatesDto dates) {
		LocalDate today = LocalDate.now();
		if (dates.getAssignmentDate().isAfter(today)) {
			throw new IllegalArgumentException("La date d'attribution ne peut pas être dans le futur");
		}
		if (dates.getDueDate().isBefore(dates.getAssignmentDate())) {
			throw new IllegalArgumentException("L'échéance ne peut pas précéder la date d'attribution");
		}
		if (assignment.getReturnDate() == null) {
			if (dates.getReturnDate() != null) {
				throw new IllegalArgumentException("Pour rendre le territoire, utilisez l'action « Retour »");
			}
			return;
		}
		if (dates.getReturnDate() == null) {
			throw new IllegalArgumentException("La date de retour est obligatoire pour une attribution terminée");
		}
		if (dates.getReturnDate().isBefore(dates.getAssignmentDate())) {
			throw new IllegalArgumentException("La date de retour ne peut pas précéder la date d'attribution");
		}
		if (dates.getReturnDate().isAfter(today)) {
			throw new IllegalArgumentException("La date de retour ne peut pas être dans le futur");
		}
	}

	/**
	 * Recalcule le statut du territoire à partir de ses attributions, avec les mêmes règles que les traitements
	 * de nuit : en retard une fois l'échéance dépassée ({@link #checkOverdueAssignments()}), en attente pendant
	 * 4 mois après le dernier retour puis disponible ({@link ITerritoryService#releasePendingTerritories()}).
	 */
	private void refreshTerritoryStatus(Territory territory) {
		LocalDate today = LocalDate.now();
		List<Assignment> assignments = territory.getAssignments();
		TerritoryStatus status = assignments.stream()
				.filter(assignment -> assignment.getReturnDate() == null)
				.findFirst()
				.map(running -> running.getDueDate() != null && running.getDueDate().isBefore(today)
						? TerritoryStatus.LATE
						: TerritoryStatus.ASSIGNED)
				.orElseGet(() -> assignments.stream()
						.map(Assignment::getReturnDate)
						.max(Comparator.naturalOrder())
						.filter(lastReturn -> !lastReturn.isBefore(today.minusMonths(4)))
						.map(lastReturn -> TerritoryStatus.PENDING)
						.orElse(TerritoryStatus.AVAILABLE));

		if (territory.getStatus() != status) {
			log.info("Territoire {} : statut {} → {} après modification des dates", territory.getName(), territory.getStatus(), status);
			territoryService.updateTerritoryStatus(territory, status);
		}
	}
}
