package com.teillet.territoire.service;

import com.teillet.territoire.model.User;

import java.time.Instant;

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

	/**
	 * Identifiant unique (jti) du token, ou {@code null} s'il est invalide ou s'il n'en porte pas
	 * (refresh tokens émis avant la rotation à usage unique).
	 */
	String extractTokenId(String token);

	/**
	 * Date d'expiration du token, ou {@code null} s'il est invalide ou expiré.
	 */
	Instant extractExpiration(String token);
}
