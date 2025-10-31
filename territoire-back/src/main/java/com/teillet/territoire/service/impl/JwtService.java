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
	private final long expirationTime; // Access token TTL
	private final long refreshExpirationTime; // Refresh token TTL

	private final Key key;

	public JwtService(
			@Value("${jwt.secret}") String secretKey,
			@Value("${jwt.expiration}") long expirationTime,
			@Value("${jwt.refreshExpiration:7776000000}") long refreshExpirationTime // default 90 days
	) {
		// Décoder et sécuriser la clé secrète
		byte[] keyBytes = Base64.getDecoder().decode(secretKey);
		this.key = Keys.hmacShaKeyFor(keyBytes);
		this.expirationTime = expirationTime;
		this.refreshExpirationTime = refreshExpirationTime;
	}

	/**
	 * Génère un token d'accès JWT pour un utilisateur donné (email).
	 */
	@Override
	public String generateToken(User user) {
		return Jwts.builder()
				.setSubject(user.getEmail())
				.claim("role", user.getRole().name())
				.claim("type", "access")
				.setIssuedAt(new Date())
				.setExpiration(new Date(System.currentTimeMillis() + expirationTime)) // expirationTime in ms (configurable)
				.signWith(key, SignatureAlgorithm.HS256)
				.compact();
	}

	@Override
	public String generateRefreshToken(User user) {
		return Jwts.builder()
				.setSubject(user.getEmail())
				.claim("type", "refresh")
				.setIssuedAt(new Date())
				.setExpiration(new Date(System.currentTimeMillis() + refreshExpirationTime))
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
	 * Vérifie si le token d'accès est valide.
	 */
	@Override
	public boolean validateToken(String token) {
		try {
			Claims claims = Jwts.parserBuilder()
					.setSigningKey(key)
					.build()
					.parseClaimsJws(token)
					.getBody();
			Object type = claims.get("type");
			return "access".equals(type);
		} catch (ExpiredJwtException e) {
			System.out.println("Token d'accès expiré");
		} catch (JwtException e) {
			System.out.println("Token invalide");
		}
		return false;
	}

	@Override
	public boolean validateRefreshToken(String token) {
		try {
			Claims claims = Jwts.parserBuilder()
					.setSigningKey(key)
					.build()
					.parseClaimsJws(token)
					.getBody();
			Object type = claims.get("type");
			return "refresh".equals(type);
		} catch (ExpiredJwtException e) {
			System.out.println("Refresh token expiré");
		} catch (JwtException e) {
			System.out.println("Refresh token invalide");
		}
		return false;
	}
}
