package com.teillet.territoire.controller;

import com.teillet.territoire.dto.PersonAccessStatusDto;
import com.teillet.territoire.dto.UpdateAccessExpirationDto;
import com.teillet.territoire.service.IPersonAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Gestion des liens personnels : consultation et envoi (responsables), régénération, révocation et expiration
 * (ADMIN et SUPERVISEUR).
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class PersonAccessController {
	private final IPersonAccessService personAccessService;

	@GetMapping("/api/acces")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
	public List<PersonAccessStatusDto> getAllStatuses() {
		return personAccessService.getAllStatuses();
	}

	@GetMapping("/api/personnes/{personId}/acces")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
	public PersonAccessStatusDto getStatus(@PathVariable UUID personId) {
		return personAccessService.getStatus(personId);
	}

	@PostMapping("/api/personnes/{personId}/acces/envoyer")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR') or hasRole('GESTIONNAIRE')")
	public PersonAccessStatusDto sendLink(@PathVariable UUID personId) {
		return personAccessService.sendLink(personId);
	}

	@PostMapping("/api/personnes/{personId}/acces/regenerer")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public PersonAccessStatusDto regenerate(@PathVariable UUID personId) {
		return personAccessService.regenerate(personId);
	}

	@PostMapping("/api/personnes/{personId}/acces/revoquer")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public PersonAccessStatusDto revoke(@PathVariable UUID personId) {
		return personAccessService.revoke(personId);
	}

	@PutMapping("/api/personnes/{personId}/acces/expiration")
	@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
	public PersonAccessStatusDto updateExpiration(@PathVariable UUID personId, @RequestBody UpdateAccessExpirationDto dto) {
		return personAccessService.updateExpiration(personId, dto.getExpiresAt());
	}
}
