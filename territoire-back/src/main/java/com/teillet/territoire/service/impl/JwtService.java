package com.teillet.territoire.service.impl;


import com.teillet.territoire.model.User;
import com.teillet.territoire.service.IJwtService;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Component
@Slf4j
public class JwtService implements IJwtService {
	static final String CLAIM_TYPE = "type";
	static final String CLAIM_VERSION = "ver";

	private final long expirationTime; // Access token TTL
	private final long refreshExpirationTime; // Refresh token TTL

	private final SecretKey key;

	public JwtService(
			@Value("${jwt.secret}") String secretKey,
			@Value("${jwt.expiration}") long expirationTime,
			@Value("${jwt.refreshExpiration:2592000000}") long refreshExpirationTime // default 30 days
	) {
		// Décoder et sécuriser la clé secrète
		byte[] keyBytes = Base64.getDecoder().decode(secretKey);
		this.key = Keys.hmacShaKeyFor(keyBytes);
		this.expirationTime = expirationTime;
		this.refreshExpirationTime = refreshExpirationTime;
	}

	public long getRefreshExpirationTime() {
		return refreshExpirationTime;
	}

	/**
	 * Génère un token d'accès JWT (courte durée) pour un utilisateur donné.
	 */
	@Override
	public String generateToken(User user) {
		return Jwts.builder()
				.subject(user.getEmail())
				.claim("role", user.getRole().name())
				.claim(CLAIM_TYPE, "access")
				.claim(CLAIM_VERSION, user.getCurrentTokenVersion())
				.issuedAt(new Date())
				.expiration(new Date(System.currentTimeMillis() + expirationTime))
				.signWith(key)
				.compact();
	}

	@Override
	public String generateRefreshToken(User user) {
		return Jwts.builder()
				// Identifiant unique : deux refresh tokens émis dans la même seconde restent distincts (usage unique)
				.id(UUID.randomUUID().toString())
				.subject(user.getEmail())
				.claim(CLAIM_TYPE, "refresh")
				.claim(CLAIM_VERSION, user.getCurrentTokenVersion())
				.issuedAt(new Date())
				.expiration(new Date(System.currentTimeMillis() + refreshExpirationTime))
				.signWith(key)
				.compact();
	}

	/**
	 * Extrait l'email (subject) du token JWT, ou {@code null} si le token est invalide ou expiré.
	 */
	@Override
	public String extractEmail(String token) {
		Claims claims = parse(token);
		return claims == null ? null : claims.getSubject();
	}

	/**
	 * Vérifie si le token d'accès est valide.
	 */
	@Override
	public boolean validateToken(String token) {
		Claims claims = parse(token);
		return claims != null && "access".equals(claims.get(CLAIM_TYPE));
	}

	@Override
	public boolean validateRefreshToken(String token) {
		Claims claims = parse(token);
		return claims != null && "refresh".equals(claims.get(CLAIM_TYPE));
	}

	@Override
	public Integer extractTokenVersion(String token) {
		Claims claims = parse(token);
		if (claims == null) {
			return null;
		}
		Object version = claims.get(CLAIM_VERSION);
		return version instanceof Number number ? number.intValue() : 0;
	}

	@Override
	public String extractTokenId(String token) {
		Claims claims = parse(token);
		return claims == null ? null : claims.getId();
	}

	@Override
	public Instant extractExpiration(String token) {
		Claims claims = parse(token);
		return claims == null ? null : claims.getExpiration().toInstant();
	}

	private Claims parse(String token) {
		try {
			return Jwts.parser()
					.verifyWith(key)
					.build()
					.parseSignedClaims(token)
					.getPayload();
		} catch (ExpiredJwtException e) {
			log.debug("Token JWT expiré");
		} catch (JwtException | IllegalArgumentException e) {
			log.debug("Token JWT invalide : {}", e.getMessage());
		}
		return null;
	}
}
