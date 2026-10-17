package com.teillet.territoire.dto;

import com.teillet.territoire.enums.AccessStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class PersonAccessStatusDto {
	private UUID personId;
	private String personName;
	private boolean hasPhone;
	private AccessStatus status;
	/** Lien complet, uniquement si l'accès est actif. */
	private String link;
	private LocalDate expiresAt;
	private Instant createdAt;
	private Instant lastUsedAt;
	private Instant lastSentAt;
	private int activeTerritories;
}
