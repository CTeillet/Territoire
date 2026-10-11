package com.teillet.territoire.controller;

import com.teillet.territoire.dto.LoginRequest;
import com.teillet.territoire.model.User;
import com.teillet.territoire.security.ClientIpResolver;
import com.teillet.territoire.security.LoginAttemptService;
import com.teillet.territoire.service.IUserService;
import com.teillet.territoire.service.impl.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/authentification")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
	static final String REFRESH_COOKIE = "refreshToken";
	static final String REFRESH_COOKIE_PATH = "/api/authentification";

	private final IUserService userService;
	private final AuthenticationManager authenticationManager;
	private final JwtService jwtService;
	private final LoginAttemptService loginAttemptService;

	/**
	 * {@code true} en production (HTTPS). Mettre à {@code false} uniquement en développement local sans HTTPS.
	 */
	@Value("${security.cookie.secure:true}")
	private boolean secureCookie;

	// 🔹 Endpoint de connexion (Login)
	@PostMapping("/connexion")
	public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
		String ip = ClientIpResolver.resolve(httpRequest);
		log.info("🛂 Tentative de connexion pour l'utilisateur : {}", request.getEmail());

		// Lève une TooManyRequestsException (429) si le compte ou l'IP sont temporairement bloqués
		loginAttemptService.checkAllowed(request.getEmail(), ip);

		try {
			authenticationManager.authenticate(
					new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
			);
		} catch (AuthenticationException e) {
			loginAttemptService.recordFailure(request.getEmail(), ip);
			log.warn("❌ Échec d'authentification pour {} depuis {}", request.getEmail(), ip);
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
					.body(Map.of("error", "Identifiants incorrects"));
		}
		loginAttemptService.recordSuccess(request.getEmail());

		User user = userService.findByEmail(request.getEmail()).orElse(null);
		if (user == null) {
			log.error("⚠️ Utilisateur introuvable après authentification : {}", request.getEmail());
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Identifiants incorrects"));
		}

		String accessToken = jwtService.generateToken(user);
		String refreshToken = jwtService.generateRefreshToken(user);
		log.info("✅ Connexion réussie pour {}", request.getEmail());

		// L'entité User ne sérialise ni le hash du mot de passe ni les champs techniques (@JsonIgnore)
		return ResponseEntity.ok()
				.header(HttpHeaders.SET_COOKIE, refreshCookie(refreshToken).toString())
				.header(HttpHeaders.SET_COOKIE, legacyCookieCleared().toString())
				.body(Map.of("user", user, "token", accessToken));
	}

	// 🔄 Endpoint de rafraîchissement du token d'accès (avec rotation du refresh token)
	@PostMapping("/refresh")
	public ResponseEntity<?> refreshToken(HttpServletRequest request) {
		String refreshToken = readRefreshCookie(request);

		if (refreshToken == null || !jwtService.validateRefreshToken(refreshToken)) {
			return unauthorized("Refresh token invalide");
		}

		String email = jwtService.extractEmail(refreshToken);
		if (email == null) {
			return unauthorized("Refresh token expiré");
		}

		User user = userService.findByEmail(email).orElse(null);
		if (user == null) {
			return unauthorized("Utilisateur introuvable");
		}

		// Refresh token émis avant une révocation (déconnexion, changement de rôle) : refusé
		if (!Objects.equals(jwtService.extractTokenVersion(refreshToken), user.getCurrentTokenVersion())) {
			log.warn("Refresh token révoqué présenté pour {}", email);
			return unauthorized("Refresh token révoqué");
		}

		String newAccessToken = jwtService.generateToken(user);
		String newRefreshToken = jwtService.generateRefreshToken(user);

		return ResponseEntity.ok()
				.header(HttpHeaders.SET_COOKIE, refreshCookie(newRefreshToken).toString())
				.header(HttpHeaders.SET_COOKIE, legacyCookieCleared().toString())
				.body(Map.of("token", newAccessToken));
	}

	/**
	 * Déconnexion : révoque tous les jetons de l'utilisateur (sur tous ses appareils) et supprime le cookie.
	 * Accessible sans jeton d'accès valide pour pouvoir toujours nettoyer le cookie.
	 */
	@PostMapping("/deconnexion")
	public ResponseEntity<Void> logout(HttpServletRequest request) {
		String refreshToken = readRefreshCookie(request);
		if (refreshToken != null && jwtService.validateRefreshToken(refreshToken)) {
			String email = jwtService.extractEmail(refreshToken);
			Integer version = jwtService.extractTokenVersion(refreshToken);
			userService.findByEmail(email)
					.filter(user -> Objects.equals(version, user.getCurrentTokenVersion()))
					.ifPresent(user -> {
						userService.revokeTokens(user.getId());
						log.info("🚪 Déconnexion et révocation des jetons pour {}", email);
					});
		}

		ResponseCookie cleared = ResponseCookie.from(REFRESH_COOKIE, "")
				.httpOnly(true)
				.secure(secureCookie)
				.sameSite("Strict")
				.path(REFRESH_COOKIE_PATH)
				.maxAge(0)
				.build();
		return ResponseEntity.noContent()
				.header(HttpHeaders.SET_COOKIE, cleared.toString())
				.header(HttpHeaders.SET_COOKIE, legacyCookieCleared().toString())
				.build();
	}

	private ResponseCookie refreshCookie(String refreshToken) {
		return ResponseCookie.from(REFRESH_COOKIE, refreshToken)
				.httpOnly(true)
				.secure(secureCookie)
				.sameSite("Strict")
				// Le cookie n'est envoyé qu'aux endpoints d'authentification
				.path(REFRESH_COOKIE_PATH)
				.maxAge(Duration.ofMillis(jwtService.getRefreshExpirationTime()))
				.build();
	}

	/**
	 * Supprime l'ancien cookie de refresh, posé sur "/" par les versions précédentes.
	 */
	private ResponseCookie legacyCookieCleared() {
		return ResponseCookie.from(REFRESH_COOKIE, "")
				.httpOnly(true)
				.secure(secureCookie)
				.sameSite("Lax")
				.path("/")
				.maxAge(0)
				.build();
	}

	private static String readRefreshCookie(HttpServletRequest request) {
		Cookie[] cookies = Optional.ofNullable(request.getCookies()).orElse(new Cookie[0]);
		for (Cookie c : cookies) {
			if (REFRESH_COOKIE.equals(c.getName())) {
				return c.getValue();
			}
		}
		return null;
	}

	private static ResponseEntity<Map<String, String>> unauthorized(String message) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", message));
	}
}
