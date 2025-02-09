package com.teillet.territoire.controller;

import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.service.AssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/assignments")
@RequiredArgsConstructor
class AssignmentController {
	private final AssignmentService assignmentService;

	@PostMapping("/assign")
	public Assignment assignTerritory(@RequestBody Assignment assignment) {
		return assignmentService.assignTerritory(assignment.getTerritory(), assignment.getPerson());
	}
}
