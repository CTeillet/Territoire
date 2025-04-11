package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Getter
@Setter
@ToString
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
	@JsonBackReference
	private Territory territory;

}
