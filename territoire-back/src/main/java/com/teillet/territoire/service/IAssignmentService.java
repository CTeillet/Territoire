package com.teillet.territoire.service;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.model.Assignment;
import jakarta.transaction.Transactional;

import java.util.UUID;

public interface IAssignmentService {
	@Transactional
	AssignmentDto assignTerritory(UUID territoryId, UUID personId);

	@Transactional
	AssignmentDto returnTerritory(UUID assignment);

	Assignment getAssignment(UUID assignmentId);
}
