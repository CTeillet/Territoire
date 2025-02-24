package com.teillet.territoire.service.impl;


import com.teillet.territoire.model.User;
import com.teillet.territoire.service.IJwtService;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.security.Key;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.Date;

@Component
public class JwtService implements IJwtService {
	private final long expirationTime;

	private final Key key;

	public JwtService(
			@Value("${jwt.secret}") String secretKey,
			@Value("${jwt.expiration}") long expirationTime
	) {
		// Décoder et sécuriser la clé secrète
		byte[] keyBytes = Base64.getDecoder().decode(secretKey);
		this.key = Keys.hmacShaKeyFor(keyBytes);
		this.expirationTime = expirationTime;
	}

	/**
	 * Génère un token JWT pour un utilisateur donné (email).
	 */
	@Override
	public String generateToken(User user) {
		return Jwts.builder()
				.setSubject(user.getEmail())
				.claim("role", user.getRole().name())
				.setIssuedAt(new Date())
				.setExpiration(new Date(System.currentTimeMillis() + expirationTime * 60 * 60 * 10)) // 10h
				.signWith(key, SignatureAlgorithm.HS256)
				.compact();
	}

	/**
	 * Extrait l'email (subject) du token JWT.
	 */
	@Override
	public String extractEmail(String token) {
		try {
			Claims claims = Jwts.parserBuilder()
					.setSigningKey(key)
					.build()
					.parseClaimsJws(token)
					.getBody(); // Vérifie si getBody() est bien obtenu

			return claims.getSubject(); // Récupère l'email
		} catch (Exception e) {
			System.out.println("Erreur lors de l'extraction du token : " + e.getMessage());
			return null;
		}
	}


	/**
	 * Vérifie si le token est valide.
	 */
	@Override
	public boolean validateToken(String token) {
		try {
			Jwts.parserBuilder()
					.setSigningKey(key)
					.build()
					.parseClaimsJws(token);
			return true;
		} catch (ExpiredJwtException e) {
			System.out.println("Token expiré");
		} catch (JwtException e) {
			System.out.println("Token invalide");
		}
		return false;
	}
}
