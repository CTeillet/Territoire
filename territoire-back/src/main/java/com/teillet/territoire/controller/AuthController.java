package com.teillet.territoire.controller;

import com.teillet.territoire.dto.LoginRequest;
import com.teillet.territoire.model.User;
import com.teillet.territoire.service.IUserService;
import com.teillet.territoire.service.impl.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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

		// Génération du token JWT
		String token = jwtService.generateToken(user);
		log.info("🔑 Token JWT généré avec succès pour {}", request.getEmail());

		return ResponseEntity.ok(Map.of("user", user, "token", token));
	}
}
