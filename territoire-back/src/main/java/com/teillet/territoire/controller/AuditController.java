package com.teillet.territoire.controller;

import com.teillet.territoire.model.AuditEvent;
import com.teillet.territoire.service.impl.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Journal des actions (les plus récentes d'abord), d'un territoire, d'une personne ou de toute l'application. */
@RestController
@RequestMapping("/api/journal")
@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
@RequiredArgsConstructor
class AuditController {
	private final AuditService audit;

	@GetMapping
	public List<AuditEvent> latest(@RequestParam(required = false) UUID territoryId,
	                               @RequestParam(required = false) UUID personId) {
		return audit.latest(territoryId, personId);
	}
}
