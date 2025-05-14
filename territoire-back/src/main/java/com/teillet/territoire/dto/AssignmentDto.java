package com.teillet.territoire.dto;

import com.teillet.territoire.model.Person;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class AssignmentDto {
	private UUID id;
	private SimplifiedTerritoryDto territory; // ✅ On garde seulement l'ID du territoire
	private Person person;
	private LocalDate assignmentDate;
	private LocalDate dueDate;
	private LocalDate returnDate;
	private CampaignDto campaign;
}
