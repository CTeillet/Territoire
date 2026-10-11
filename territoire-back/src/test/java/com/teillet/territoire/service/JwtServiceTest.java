package com.teillet.territoire.service;

import com.teillet.territoire.enums.Role;
import com.teillet.territoire.model.User;
import com.teillet.territoire.service.impl.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
