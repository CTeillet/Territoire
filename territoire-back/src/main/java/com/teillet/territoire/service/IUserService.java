package com.teillet.territoire.service;

import com.teillet.territoire.dto.RegisterRequest;
import com.teillet.territoire.model.User;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IUserService extends UserDetailsService {
	Optional<User> findByEmail(String email);

	User registerUser(RegisterRequest request);

	List<User> findAllUsers();

	void updateUserRole(UUID userId, String newRole);

	// 🔹 Supprimer un utilisateur
	void deleteUser(UUID userId);

	/**
	 * Révoque tous les jetons (accès et refresh) déjà émis pour cet utilisateur.
	 */
	void revokeTokens(UUID userId);

	/**
	 * Change le mot de passe après vérification de l'ancien, et révoque tous les jetons existants.
	 *
	 * @throws IllegalArgumentException si le mot de passe actuel est incorrect
	 */
	void changePassword(UUID userId, String currentPassword, String newPassword);
}
