package com.teillet.territoire.controller;

import org.springframework.web.bind.annotation.GetMapping;
import com.teillet.territoire.service.IWhatsAppMonitor;
import com.teillet.territoire.dto.WhatsAppStatusDto;
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
 * Test de l'envoi WhatsApp (via WAHA), réservé à l'administrateur, et état des envois (dernier succès, dernier échec).
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class WhatsAppTestController {
	private final IWhatsAppTestService whatsAppTestService;
	private final IWhatsAppMonitor whatsAppMonitor;

	/** Envois en échec : bandeau d'alerte pour ceux qui attribuent et envoient les liens. */
	@GetMapping("/api/whatsapp/etat")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
	public WhatsAppStatusDto status() {
		return whatsAppMonitor.getStatus();
	}

	@PostMapping("/api/whatsapp/test")
	@PreAuthorize("hasRole('ADMIN')")
	public WhatsAppTestResultDto sendTest(@Valid @RequestBody WhatsAppTestRequestDto request) {
		log.info("Envoi d'un message WhatsApp de test à la personne {}", request.getPersonId());
		return whatsAppTestService.sendTestMessage(request.getPersonId(), request.getMessage());
	}
}
