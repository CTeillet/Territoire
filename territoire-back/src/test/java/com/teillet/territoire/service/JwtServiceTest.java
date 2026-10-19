package com.teillet.territoire.service;

import com.teillet.territoire.enums.Role;
import com.teillet.territoire.model.User;
import com.teillet.territoire.service.impl.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

	private JwtService jwtService;
	private final String secretKey = "dGVzdF9zZWNyZXRfa2V5X2Zvcl9qd3RfYXV0aGVudGljYXRpb25fdGVzdHNfc3ByaW5nX2Jvb3RfMTIzNDU2Nzg5MA==";
	private final long expiration = 3600000L; // 1 hour
	private final long refreshExpiration = 86400000L; // 1 day

	private User user;

	@BeforeEach
	void setUp() {
		jwtService = new JwtService(secretKey, expiration, refreshExpiration);

		user = new User();
		user.setId(UUID.randomUUID());
		user.setEmail("test@territoire.fr");
		user.setUsername("testuser");
		user.setRole(Role.ADMIN);
	}

	@Test
	void testRefreshTokens_UniqueIdAndExpiration() {
		String first = jwtService.generateRefreshToken(user);
		String second = jwtService.generateRefreshToken(user);

		// Émis dans la même seconde, les deux jetons restent distincts grâce à leur identifiant
		assertNotNull(jwtService.extractTokenId(first));
		assertNotEquals(jwtService.extractTokenId(first), jwtService.extractTokenId(second));
		assertNotEquals(first, second);

		Instant expiresAt = jwtService.extractExpiration(first);
		assertTrue(expiresAt.isAfter(Instant.now().plusMillis(refreshExpiration - 60_000)));
		assertTrue(expiresAt.isBefore(Instant.now().plusMillis(refreshExpiration + 60_000)));

		assertNull(jwtService.extractTokenId("invalid.token.string"));
		assertNull(jwtService.extractExpiration("invalid.token.string"));
	}

	@Test
	void testGenerateAndValidateAccessToken() {
		String token = jwtService.generateToken(user);
		assertNotNull(token);

		assertTrue(jwtService.validateToken(token));
		assertFalse(jwtService.validateRefreshToken(token));

		String email = jwtService.extractEmail(token);
		assertEquals("test@territoire.fr", email);
	}

	@Test
	void testGenerateAndValidateRefreshToken() {
		String refreshToken = jwtService.generateRefreshToken(user);
		assertNotNull(refreshToken);

		assertTrue(jwtService.validateRefreshToken(refreshToken));
		assertFalse(jwtService.validateToken(refreshToken));

		String email = jwtService.extractEmail(refreshToken);
		assertEquals("test@territoire.fr", email);
	}

	@Test
	void testTokenVersion() {
		assertEquals(0, jwtService.extractTokenVersion(jwtService.generateRefreshToken(user)));

		user.incrementTokenVersion();
		assertEquals(1, jwtService.extractTokenVersion(jwtService.generateToken(user)));
		assertEquals(1, jwtService.extractTokenVersion(jwtService.generateRefreshToken(user)));

		assertNull(jwtService.extractTokenVersion("invalid.token.string"));
	}

	@Test
	void testExpiredTokenIsRejected() {
		JwtService shortLived = new JwtService(secretKey, -1000L, -1000L);
		String token = shortLived.generateToken(user);
		assertFalse(shortLived.validateToken(token));
		assertNull(shortLived.extractEmail(token));
	}

	@Test
	void testInvalidToken() {
		assertFalse(jwtService.validateToken("invalid.token.string"));
		assertFalse(jwtService.validateRefreshToken("invalid.token.string"));
		assertNull(jwtService.extractEmail("invalid.token.string"));
	}

	@Test
	void testExpiredToken() {
		JwtService shortLivedJwtService = new JwtService(secretKey, -1000L, -1000L);
		String expiredToken = shortLivedJwtService.generateToken(user);

		assertFalse(shortLivedJwtService.validateToken(expiredToken));
		assertNull(shortLivedJwtService.extractEmail(expiredToken));
	}
}
