package com.teillet.territoire.controller;

import com.teillet.territoire.dto.WhatsAppTestRequestDto;
import com.teillet.territoire.dto.WhatsAppTestResultDto;
import com.teillet.territoire.service.IWhatsAppTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test de l'envoi WhatsApp (via WAHA), réservé à l'administrateur.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class WhatsAppTestController {
	private final IWhatsAppTestService whatsAppTestService;

	@PostMapping("/api/whatsapp/test")
	@PreAuthorize("hasRole('ADMIN')")
	public WhatsAppTestResultDto sendTest(@Valid @RequestBody WhatsAppTestRequestDto request) {
		log.info("Envoi d'un message WhatsApp de test à la personne {}", request.getPersonId());
		return whatsAppTestService.sendTestMessage(request.getPersonId(), request.getMessage());
	}
}
