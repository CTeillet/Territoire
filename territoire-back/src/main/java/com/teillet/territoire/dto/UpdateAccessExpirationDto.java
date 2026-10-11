package com.teillet.territoire.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateAccessExpirationDto {
	/** Date de fin d'accès incluse ; null = sans expiration. */
	private LocalDate expiresAt;
}
