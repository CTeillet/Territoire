package com.teillet.territoire.service;

import com.teillet.territoire.enums.Role;
import com.teillet.territoire.model.RefreshToken;
import com.teillet.territoire.model.User;
import com.teillet.territoire.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class RefreshTokenServiceTest {

	@Autowired
	private IRefreshTokenService refreshTokenService;

	@Autowired
	private RefreshTokenRepository refreshTokenRepository;

	@BeforeEach
	void setUp() {
		refreshTokenRepository.deleteAll();
	}

	@Test
	void issue_StoresOnlyTheHash() {
		User user = new User();
		user.setId(UUID.randomUUID());
		user.setEmail("refresh.test@territoire.fr");
		user.setRole(Role.UTILISATEUR);

		String token = refreshTokenService.issue(user);

		RefreshToken stored = refreshTokenRepository.findAll().getFirst();
		assertEquals(64, stored.getTokenHash().length());
		assertFalse(token.contains(stored.getTokenHash()));
		assertEquals(user.getId(), stored.getUserId());
		assertNull(stored.getUsedAt());
		assertTrue(stored.getExpiresAt().isAfter(Instant.now().plus(Duration.ofDays(29))));
	}

	@Test
	void purgeExpired_KeepsValidTokens() {
		UUID userId = UUID.randomUUID();
		refreshTokenRepository.save(RefreshToken.builder()
				.tokenHash("a".repeat(64)).userId(userId).expiresAt(Instant.now().minusSeconds(60)).build());
		refreshTokenRepository.save(RefreshToken.builder()
				.tokenHash("b".repeat(64)).userId(userId).expiresAt(Instant.now().plusSeconds(3600)).build());

		refreshTokenService.purgeExpired();

		assertEquals(List.of("b".repeat(64)),
				refreshTokenRepository.findAll().stream().map(RefreshToken::getTokenHash).toList());
	}
}
