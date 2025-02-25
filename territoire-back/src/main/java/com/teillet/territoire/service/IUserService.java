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
}
