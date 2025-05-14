package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.AssignmentDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import com.teillet.territoire.model.Assignment;

public class AssignmentMapper {
	// ✅ Constructeur pour convertir `Assignment` en `AssignmentDTO`
	public static AssignmentDto toDto(Assignment assignment) {
		return AssignmentDto.builder()
				.id(assignment.getId())
				.territory(SimplifiedTerritoryDto.builder().territoryId(assignment.getTerritory().getId()).name(assignment.getTerritory().getName()).status(assignment.getTerritory().getStatus()).build()) // Seul l'ID est récupéré
				.person(assignment.getPerson())
				.assignmentDate(assignment.getAssignmentDate())
				.dueDate(assignment.getDueDate())
				.returnDate(assignment.getReturnDate())
				.campaign(CampaignMapper.toDto(assignment.getCampaign()))
				.build();
	}
}
