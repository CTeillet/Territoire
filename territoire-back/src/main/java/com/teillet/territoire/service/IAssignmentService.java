package com.teillet.territoire.service;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Campaign;
import com.teillet.territoire.model.Territory;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

public interface IAssignmentService {
	@Transactional
	AssignmentDto assignTerritory(UUID territoryId, UUID personId);

	@Transactional
	AssignmentDto returnTerritory(UUID assignment);

    void checkOverdueAssignments();

    Assignment getAssignment(UUID assignmentId);

	List<AssignmentDto> getLastAssignments();

	AssignmentDto extendTerritory(UUID territoryId);

	@Transactional
	void createCampaignAssignments(Campaign campaign, List<Territory> usedTerritories);
}
