package com.teillet.territoire.controller;

import com.teillet.territoire.dto.RegisterRequest;
import com.teillet.territoire.model.User;
import com.teillet.territoire.service.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {
	private final IUserService userService;

	@GetMapping
	public ResponseEntity<List<User>> getAllUsers() {
		return ResponseEntity.ok(userService.findAllUsers());
	}

	// 🔹 Endpoint d'inscription (Register)
	@PostMapping
	public ResponseEntity<User> register(@Valid @RequestBody RegisterRequest request) {

		if (userService.findByEmail(request.getEmail()).isPresent()) {
			return ResponseEntity.badRequest().build();
		}

		User user = userService.registerUser(request);

		return ResponseEntity.ok(user);
	}

	// 🔹 Modifier le rôle d’un utilisateur
	@PutMapping("/{id}/role")
	public ResponseEntity<?> updateUserRole(@PathVariable UUID id, @RequestBody Map<String, String> request) {
		String newRole = request.get("role");

		if (newRole == null || newRole.isEmpty()) {
			return ResponseEntity.badRequest().body(Map.of("error", "Le rôle est requis"));
		}

		userService.updateUserRole(id, newRole);
		return ResponseEntity.ok(Map.of("message", "Rôle mis à jour avec succès"));
	}

	// 🔹 Supprimer un utilisateur
	@DeleteMapping("/{id}")
	public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
		userService.deleteUser(id);
		return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès"));
	}
}
