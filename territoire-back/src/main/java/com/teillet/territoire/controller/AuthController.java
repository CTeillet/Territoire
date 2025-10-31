package com.teillet.territoire.controller;

import com.teillet.territoire.dto.LoginRequest;
import com.teillet.territoire.model.User;
import com.teillet.territoire.service.IUserService;
import com.teillet.territoire.service.impl.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.Optional;

@RestController
@RequestMapping("/api/authentification")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
	private final IUserService userService;
	private final AuthenticationManager authenticationManager;
	private final JwtService jwtService;

	// 🔹 Endpoint de connexion (Login)
	@PostMapping("/connexion")
	public ResponseEntity<?> login(@RequestBody LoginRequest request) {
		log.info("🛂 Tentative de connexion pour l'utilisateur : {}", request.getEmail());

		try {
			authenticationManager.authenticate(
					new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
			);
			log.info("✅ Authentification réussie pour {}", request.getEmail());

		} catch (AuthenticationException e) {
			log.warn("❌ Échec d'authentification pour {}", request.getEmail());
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
					.body(Map.of("error", "Identifiants incorrects"));
		}

		// Récupération de l'utilisateur après authentification
		User user = userService.findByEmail(request.getEmail()).orElseThrow(() -> {
			log.error("⚠️ Utilisateur introuvable après authentification : {}", request.getEmail());
			return new RuntimeException("Utilisateur introuvable");
		});

		// Génération des tokens JWT
		String accessToken = jwtService.generateToken(user);
		String refreshToken = jwtService.generateRefreshToken(user);
		log.info("🔑 Tokens JWT générés avec succès pour {}", request.getEmail());

		// Déposer le refresh token en cookie HttpOnly
		ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", refreshToken)
				.httpOnly(true)
				.secure(false) // mettre à true derrière HTTPS
				.sameSite("Lax")
				.path("/")
				.maxAge(Duration.ofDays(90))
				.build();

		return ResponseEntity.ok()
				.header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
				.body(Map.of("user", user, "token", accessToken));
	}

	// 🔄 Endpoint de rafraîchissement du token d'accès
	@PostMapping("/refresh")
	public ResponseEntity<?> refreshToken(HttpServletRequest request) {
		String refreshToken = null;
		Cookie[] cookies = Optional.ofNullable(request.getCookies()).orElse(new Cookie[0]);
		for (Cookie c : cookies) {
			if ("refreshToken".equals(c.getName())) {
				refreshToken = c.getValue();
				break;
			}
		}

		if (refreshToken == null || !jwtService.validateRefreshToken(refreshToken)) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Refresh token invalide"));
		}

		String email = jwtService.extractEmail(refreshToken);
		if (email == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Refresh token expiré"));
		}

		User user = userService.findByEmail(email).orElse(null);
		if (user == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Utilisateur introuvable"));
		}

		// Rotation du refresh token et génération d'un nouveau access token
		String newAccessToken = jwtService.generateToken(user);
		String newRefreshToken = jwtService.generateRefreshToken(user);

		ResponseCookie newRefreshCookie = ResponseCookie.from("refreshToken", newRefreshToken)
				.httpOnly(true)
				.secure(false)
				.sameSite("Lax")
				.path("/")
				.maxAge(Duration.ofDays(90))
				.build();

		return ResponseEntity.ok()
				.header(HttpHeaders.SET_COOKIE, newRefreshCookie.toString())
				.body(Map.of("token", newAccessToken));
	}
}
