package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.RegisterRequest;
import com.teillet.territoire.enums.Role;
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
		User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
		user.setRole(Role.valueOf(newRole)); // Assure-toi que `Role` est une Enum avec `ADMIN`, `UTILISATEUR`, etc.
		userRepository.save(user);
	}

	// 🔹 Supprimer un utilisateur
	@Override
	public void deleteUser(UUID userId) {
		userRepository.deleteById(userId);
	}
}
