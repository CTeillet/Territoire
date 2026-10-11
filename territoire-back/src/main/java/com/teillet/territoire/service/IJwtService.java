package com.teillet.territoire.service;

import com.teillet.territoire.model.User;

public interface IJwtService {
	String generateToken(User user);

	String generateRefreshToken(User user);

	String extractEmail(String token);

	boolean validateToken(String token);

	boolean validateRefreshToken(String token);

	/**
	 * Version de jeton portée par le token ({@code 0} pour les jetons émis avant l'introduction de la révocation),
	 * ou {@code null} si le token est invalide.
	 */
	Integer extractTokenVersion(String token);
}
