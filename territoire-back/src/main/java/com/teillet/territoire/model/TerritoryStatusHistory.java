package com.teillet.territoire.model;

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
public class TerritoryStatusHistory {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@Column(nullable = false)
	private LocalDate date;

	@Column(nullable = false)
	private int availableTerritory;

	@Column(nullable = false)
	private int lateTerritory;

	@Column(nullable = false)
	private int pendingTerritory;

	@Column(nullable = false)
	private int assignedTerritory;
}
