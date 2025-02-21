package com.teillet.territoire.service;

import com.teillet.territoire.model.Assignment;
import jakarta.transaction.Transactional;

import java.util.UUID;

public interface IAssignmentService {
	@Transactional
	Assignment assignTerritory(UUID territoryId, UUID personId);

	@Transactional
	void returnTerritory(Assignment assignment);
}
