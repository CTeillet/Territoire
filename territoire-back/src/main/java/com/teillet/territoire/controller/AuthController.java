package com.teillet.territoire.controller;

import com.teillet.territoire.dto.LoginRequest;
import com.teillet.territoire.model.User;
import com.teillet.territoire.service.IUserService;
import com.teillet.territoire.service.impl.JwtService;
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
	private final IUserService userService;
	private final AuthenticationManager authenticationManager;
	private final JwtService jwtService;

	// 🔹 Endpoint de connexion (Login)
	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestBody LoginRequest request) {

		try {
			authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
		} catch (AuthenticationException e) {
			return ResponseEntity.status(401).body(Map.of("error", "Identifiants incorrects"));
		}

		User user = userService.findByEmail(request.getEmail()).orElseThrow();
		String token = jwtService.generateToken(user);

		return ResponseEntity.ok(Map.of("user", user, "token", token));
	}
}
