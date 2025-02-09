package com.teillet.territoire.service;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentService {
	private final AssignmentRepository assignmentRepository;
	private final TerritoryService territoryService;


	public Assignment assignTerritory(Territory territory, Person person) {
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
		return assignmentRepository.save(assignment);
	}

	public void returnTerritory(Assignment assignment) {
		assignment.setReturnDate(LocalDate.now());
		assignmentRepository.save(assignment);

		territoryService.updateTerritoryStatus(assignment.getTerritory(), TerritoryStatus.PENDING);
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
}
