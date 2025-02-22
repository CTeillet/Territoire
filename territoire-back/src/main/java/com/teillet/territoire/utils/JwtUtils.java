package com.teillet.territoire.utils;


import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.security.Key;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtils {
	private final long expirationTime;

	private final Key key;

	public JwtUtils(
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
	public String generateToken(String email) {
		return Jwts.builder()
				.setSubject(email) // L'email sera utilisé comme "identité"
				.setIssuedAt(new Date()) // Date de création
				.setExpiration(new Date(System.currentTimeMillis() + expirationTime)) // Expiration
				.signWith(key, SignatureAlgorithm.HS256) // Signature sécurisée avec la clé
				.compact();
	}

	/**
	 * Extrait l'email (subject) du token JWT.
	 */
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
