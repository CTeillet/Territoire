package com.teillet.territoire.controller;

import com.teillet.territoire.dto.PublicAccessDto;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.security.ClientIpResolver;
import com.teillet.territoire.security.LoginAttemptService;
import com.teillet.territoire.service.IPersonAccessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.function.Supplier;

/**
 * Accès sans compte, via le lien personnel envoyé à chaque personne : consultation et retour de ses territoires en cours.
 * Les liens invalides répétés depuis une même adresse IP sont temporairement bloqués (HTTP 429).
 */
@RestController
@RequestMapping("/api/public/acces/{token}")
@RequiredArgsConstructor
public class PublicAccessController {
	static final String RATE_LIMIT_SCOPE = "lien-public";

	private final IPersonAccessService personAccessService;
	private final LoginAttemptService attemptService;

	@GetMapping
	public ResponseEntity<PublicAccessDto> getAccess(@PathVariable String token, HttpServletRequest request) {
		return guarded(request, () -> personAccessService.getPublicView(token));
	}

	@PostMapping("/territoires/{territoryId}/retour")
	public ResponseEntity<PublicAccessDto> returnTerritory(@PathVariable String token, @PathVariable UUID territoryId,
	                                                       HttpServletRequest request) {
		return guarded(request, () -> personAccessService.returnTerritory(token, territoryId));
	}

	private ResponseEntity<PublicAccessDto> guarded(HttpServletRequest request, Supplier<PublicAccessDto> action) {
		String ip = ClientIpResolver.resolve(request);
		attemptService.checkIpAllowed(RATE_LIMIT_SCOPE, ip);
		try {
			return ResponseEntity.ok()
					// Données personnelles : jamais en cache partagé (le hors-ligne est géré par le service worker)
					.cacheControl(CacheControl.noStore())
					.body(action.get());
		} catch (NotFoundException e) {
			attemptService.recordIpFailure(RATE_LIMIT_SCOPE, ip);
			throw e;
		}
	}
}
