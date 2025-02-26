package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.service.IAssignmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}
