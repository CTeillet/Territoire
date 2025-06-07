package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.enums.TerritoryStatus;
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
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class AssignmentService implements IAssignmentService {
	private final AssignmentRepository assignmentRepository;
	private final ITerritoryService territoryService;
	private final IPersonService personService;

	public AssignmentService(
		AssignmentRepository assignmentRepository,
		@Lazy ITerritoryService territoryService,
		IPersonService personService
	) {
		this.assignmentRepository = assignmentRepository;
		this.territoryService = territoryService;
		this.personService = personService;
	}

	@Transactional
	@Override
	public AssignmentDto assignTerritory(UUID territoryId, UUID personId) {
		Person person = personService.getPerson(personId);
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
		return AssignmentMapper.toDto(assignmentRepository.save(assignment));
	}

	@Transactional
	@Override
	public AssignmentDto returnTerritory(UUID territoryId) {
		// Récupérer l'assignation en cours pour ce territoire
		Assignment assignment = findAssignmentRunning(territoryId);

		assignment.setReturnDate(LocalDate.now());
		assignmentRepository.save(assignment);
		territoryService.updateTerritoryStatus(assignment.getTerritory(), TerritoryStatus.PENDING);
		Assignment resultAssignment = getAssignment(assignment.getId());
		return AssignmentMapper.toDto(resultAssignment);
	}

	private Assignment findAssignmentRunning(UUID territoryId) {
		return assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId)
				.orElseThrow(() -> new EntityNotFoundException("Aucune assignation active trouvée pour ce territoire"));
	}

	@Scheduled(cron = "0 0 0 * * *")
	@Override
	public void checkOverdueAssignments() {
		List<Assignment> overdueAssignments = assignmentRepository.findByDueDateBeforeAndReturnDateIsNull(LocalDate.now());
		for (Assignment assignment : overdueAssignments) {
			log.info("Territoire {} est en retard", assignment.getTerritory().getName());

			Territory territory = assignment.getTerritory();
			territory.setStatus(TerritoryStatus.LATE);
			territoryService.saveTerritory(territory);
		}
	}

	@Override
	public Assignment getAssignment(UUID assignmentId) {
		return assignmentRepository.findById(assignmentId)
				.orElseThrow(() -> new RuntimeException("Aucune assignation active trouvée pour ce territoire"));
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
}
