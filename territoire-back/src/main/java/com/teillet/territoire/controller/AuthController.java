package com.teillet.territoire.controller;

import com.teillet.territoire.model.User;
import com.teillet.territoire.service.UserService;
import com.teillet.territoire.utils.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
	private final UserService userService;
	private final AuthenticationManager authenticationManager;
	private final JwtUtils jwtUtils;

	// 🔹 Endpoint de connexion (Login)
	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		String password = request.get("password");

		try {
			authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));
		} catch (AuthenticationException e) {
			return ResponseEntity.status(401).body(Map.of("error", "Identifiants incorrects"));
		}

		User user = userService.findByEmail(email).orElseThrow();
		String token = jwtUtils.generateToken(email);

		return ResponseEntity.ok(Map.of("user", user, "token", token));
	}

	// 🔹 Endpoint d'inscription (Register)
	@PostMapping("/register")
	public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		String password = request.get("password");
		String username = request.get("username");

		if (userService.findByEmail(email).isPresent()) {
			return ResponseEntity.badRequest().body(Map.of("error", "Email déjà utilisé"));
		}

		User user = userService.registerUser(email, password, username);
		String token = jwtUtils.generateToken(email);

		return ResponseEntity.ok(Map.of("user", user, "token", token));
	}
}
