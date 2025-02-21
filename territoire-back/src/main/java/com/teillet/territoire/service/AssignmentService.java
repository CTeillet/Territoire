package com.teillet.territoire.service;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.mapper.AssignmentMapper;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssignmentService implements IAssignmentService {
	private final AssignmentRepository assignmentRepository;
	private final TerritoryService territoryService;
	private final IPersonService personService;

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
		Assignment assignment = assignmentRepository.findByReturnDateNullAndTerritory_Id(territoryId)
				.orElseThrow(() -> new EntityNotFoundException("Aucune assignation active trouvée pour ce territoire"));

		assignment.setReturnDate(LocalDate.now());
		assignmentRepository.save(assignment);
		territoryService.updateTerritoryStatus(assignment.getTerritory(), TerritoryStatus.PENDING);
		Assignment resultAssignment = getAssignment(assignment.getId());
		return AssignmentMapper.toDto(resultAssignment);
	}

	@Scheduled(cron = "0 0 0 * * *")
	public void checkOverdueAssignments() {
		List<Assignment> overdueAssignments = assignmentRepository.findByDueDateBeforeAndReturnDateIsNull(LocalDate.now());
		for (Assignment assignment : overdueAssignments) {
			System.out.println("Reminder: Territory " + assignment.getTerritory().getId() + " is overdue for return.");

			Territory territory = assignment.getTerritory();
			territory.setStatus(TerritoryStatus.LATE);
			territoryService.saveTerritory(territory);
		}
	}

	@Override
	public Assignment getAssignment(UUID assignmentId) {
		return assignmentRepository.findById(assignmentId)
				.orElseThrow(() -> new RuntimeException("Territoire non trouvé"));
	}
}
