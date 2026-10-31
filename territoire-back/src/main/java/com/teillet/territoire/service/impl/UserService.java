package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.RegisterRequest;
import com.teillet.territoire.enums.Role;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.model.User;
import com.teillet.territoire.repository.UserRepository;
import com.teillet.territoire.service.IUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService implements IUserService {
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	@Override
	public Optional<User> findByEmail(String email) {
		return userRepository.findByEmail(email);
	}

	@Override
	public User registerUser(RegisterRequest request) {
		User user = new User();
		user.setEmail(request.getEmail());
		user.setPassword(passwordEncoder.encode(request.getPassword()));
		user.setUsername(request.getUsername());
		user.setRole(request.getRole());
		return userRepository.save(user);
	}

	@Override
	public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
		return userRepository.findByEmail(email)
				.orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
	}

	// 🔹 Récupérer tous les utilisateurs
	@Override
	public List<User> findAllUsers() {
		return userRepository.findAll();
	}

	@Override
	public void updateUserRole(UUID userId, String newRole) {
		User user = getUser(userId);
		Role role;
		try {
			role = Role.valueOf(newRole);
		} catch (IllegalArgumentException e) {
			throw new IllegalArgumentException("Rôle inconnu : " + newRole);
		}
		if (user.getRole() == Role.ADMIN && role != Role.ADMIN) {
			ensureNotLastAdmin();
		}
		user.setRole(role);
		// Les jetons existants portent l'ancien rôle : on les révoque pour forcer une reconnexion
		user.incrementTokenVersion();
		userRepository.save(user);
	}

	@Override
	public void revokeTokens(UUID userId) {
		User user = getUser(userId);
		user.incrementTokenVersion();
		userRepository.save(user);
	}

	private User getUser(UUID userId) {
		return userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Utilisateur non trouvé"));
	}

	// 🔹 Supprimer un utilisateur
	@Override
	public void deleteUser(UUID userId) {
		userRepository.findById(userId)
				.filter(user -> user.getRole() == Role.ADMIN)
				.ifPresent(user -> ensureNotLastAdmin());
		userRepository.deleteById(userId);
	}

	/** Sans administrateur, plus personne ne peut gérer les comptes (récupération à la main en base). */
	private void ensureNotLastAdmin() {
		if (userRepository.countByRole(Role.ADMIN) <= 1) {
			throw new IllegalStateException("Impossible : il doit rester au moins un administrateur");
		}
	}

	@Override
	public void changePassword(UUID userId, String currentPassword, String newPassword) {
		User user = getUser(userId);
		if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
			throw new IllegalArgumentException("Mot de passe actuel incorrect");
		}
		user.setPassword(passwordEncoder.encode(newPassword));
		user.incrementTokenVersion();
		userRepository.save(user);
	}

	@Override
	public void resetPassword(UUID userId, String newPassword) {
		User user = getUser(userId);
		user.setPassword(passwordEncoder.encode(newPassword));
		user.incrementTokenVersion();
		userRepository.save(user);
	}
}
