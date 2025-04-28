package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.ITerritoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attributions")
@RequiredArgsConstructor
@Slf4j
public class AssignmentController {
	private final IAssignmentService assignmentService;
	private final ITerritoryService territoryService;

	@GetMapping("/dernieres")
	public List<AssignmentDto> getLastAssignments() {
		log.info("Requête reçue : GET /api/attributions/dernieres");

		List<AssignmentDto> assignments = assignmentService.getLastAssignments();

		log.info("Réponse envoyée : {} attributions trouvées", assignments.size());
		return assignments;
	}

	@PutMapping("/verification-retard")
	public void checkLate() {
		log.info("Requête reçue : PUT /api/attributions/verification-retard");

		assignmentService.checkOverdueAssignments();

		log.info("Fin traitement vérification territoires en retard");

	}

	@DeleteMapping
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void deleteAllAssignments() {
		log.info("Requête reçue : DELETE /api/attributions");

		territoryService.revokeAssignmentsBulk(null);

		log.info("Fin traitement suppression de toutes les attributions");
	}

	@DeleteMapping("/{city}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void deleteAssignmentsByCity(@PathVariable String city) {
		log.info("Requête reçue : DELETE /api/attributions/{}", city);

		territoryService.revokeAssignmentsBulk(city);

		log.info("Fin traitement suppression des attributions");
	}

}
