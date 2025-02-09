package com.teillet.territoire.model;

import com.teillet.territoire.enums.TerritoryStatus;
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
public class StatusHistory {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	@ManyToOne
	@JoinColumn(name = "territory_id")
	private Territory territory;

	@Enumerated(EnumType.STRING)
	private TerritoryStatus previousStatus;

	@Enumerated(EnumType.STRING)
	private TerritoryStatus newStatus;

	private LocalDate changeDate;
}
