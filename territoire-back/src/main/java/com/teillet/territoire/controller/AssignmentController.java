package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.dto.UpdateAssignmentDatesDto;
import com.teillet.territoire.service.IAssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/attributions")
@RequiredArgsConstructor
@Slf4j
public class AssignmentController {
	private final IAssignmentService assignmentService;

	@GetMapping("/dernieres")
	public List<AssignmentDto> getLastAssignments() {
		log.info("Requête reçue : GET /api/attributions/dernieres");

		List<AssignmentDto> assignments = assignmentService.getLastAssignments();

		log.info("Réponse envoyée : {} attributions trouvées", assignments.size());
		return assignments;
	}

	@GetMapping("/periode")
	public List<AssignmentDto> getAssignmentsInPeriod(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
		log.info("Requête reçue : GET /api/attributions/periode?startDate={}&endDate={}", startDate, endDate);

		List<AssignmentDto> assignments = assignmentService.getAssignmentsInPeriod(startDate, endDate);

		log.info("Réponse envoyée : {} attributions trouvées pour la période", assignments.size());
		return assignments;
	}

	@PutMapping("/{assignmentId}")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
	public AssignmentDto updateAssignmentDates(@PathVariable UUID assignmentId, @Valid @RequestBody UpdateAssignmentDatesDto dates) {
		log.info("Requête reçue : PUT /api/attributions/{} : {}", assignmentId, dates);

		AssignmentDto result = assignmentService.updateAssignmentDates(assignmentId, dates);

		log.info("Dates de l'attribution {} modifiées, statut du territoire : {}", assignmentId, result.getTerritory().getStatus());
		return result;
	}

	@PutMapping("/verification-retard")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public void checkLate() {
		log.info("Requête reçue : PUT /api/attributions/verification-retard");

		assignmentService.checkOverdueAssignments();

		log.info("Fin traitement vérification territoires en retard");

	}

}
