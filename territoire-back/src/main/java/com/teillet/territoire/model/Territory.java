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
public class Territory {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	private String name;

	@Enumerated(EnumType.STRING)
	private TerritoryStatus status;

	private LocalDate lastModifiedDate;
}
