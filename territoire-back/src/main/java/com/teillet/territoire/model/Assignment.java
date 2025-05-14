package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@ManyToOne
	@JoinColumn(name = "person_id")
	private Person person;

	private LocalDate assignmentDate;
	private LocalDate dueDate;
	private LocalDate returnDate;

	@ManyToOne
	@JoinColumn(name = "territory_id")
	@JsonBackReference(value = "territory-assignments")
	private Territory territory;

	@ManyToOne
	@JoinColumn(name = "campaign_id")
	@JsonBackReference(value = "campaign-assignments")
	private Campaign campaign;

	@Override
	public String toString() {
		return "Assignment{" +
				"id=" + id +
				", person=" + (person != null ? person.getId() : null) +
				", assignmentDate=" + assignmentDate +
				", dueDate=" + dueDate +
				", returnDate=" + returnDate +
				", territory=" + (territory != null ? territory.getId() : null) +
				", campaign=" + (campaign != null ? campaign.getId() : null) +
				'}';
	}

}
