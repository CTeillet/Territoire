package com.teillet.territoire.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateAssignmentDatesDto {
	@NotNull
	private LocalDate assignmentDate;
	@NotNull
	private LocalDate dueDate;
	/** Obligatoire pour une attribution terminée, null pour une attribution en cours (le retour se fait via « Retour »). */
	private LocalDate returnDate;
}
