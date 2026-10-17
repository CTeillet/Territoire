package com.teillet.territoire.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class WhatsAppTestRequestDto {
	@NotNull(message = "Choisissez un destinataire")
	private UUID personId;

	@NotBlank(message = "Le message ne peut pas être vide")
	@Size(max = 1000, message = "Le message ne doit pas dépasser 1000 caractères")
	private String message;
}
