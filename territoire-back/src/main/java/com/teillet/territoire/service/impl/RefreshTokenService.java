package com.teillet.territoire.service.impl;

import com.teillet.territoire.model.RefreshToken;
import com.teillet.territoire.model.User;
import com.teillet.territoire.repository.RefreshTokenRepository;
import com.teillet.territoire.service.IJwtService;
import com.teillet.territoire.service.IRefreshTokenService;
import com.teillet.territoire.service.IUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService implements IRefreshTokenService {
	/**
	 * Deux onglets dont le jeton d'accès expire en même temps renouvellent avec le même refresh token :
	 * dans ce délai, la seconde utilisation n'est pas traitée comme un vol.
	 */
	static final Duration CONCURRENT_USE_GRACE = Duration.ofSeconds(30);

	private final RefreshTokenRepository refreshTokenRepository;
	private final IJwtService jwtService;
	private final IUserService userService;
	private final Clock clock;

	@Override
	@Transactional
	public String issue(User user) {
		String token = jwtService.generateRefreshToken(user);
		refreshTokenRepository.save(RefreshToken.builder()
				.tokenHash(hash(token))
				.userId(user.getId())
				.expiresAt(jwtService.extractExpiration(token))
				.build());
		return token;
	}

	@Override
	@Transactional
	public Usage use(String refreshToken, User user) {
		String tokenHash = hash(refreshToken);
		Instant now = clock.instant();
		if (refreshTokenRepository.markUsed(tokenHash, now) == 1) {
			return Usage.FIRST_USE;
		}

		Optional<RefreshToken> known = refreshTokenRepository.findByTokenHash(tokenHash);
		if (known.isEmpty()) {
			if (jwtService.extractTokenId(refreshToken) != null) {
				return Usage.UNKNOWN;
			}
			// Jeton émis avant la rotation à usage unique (sans identifiant) : accepté une dernière fois, puis consommé.
			// Ces jetons expirent au plus tard 90 jours après le déploiement : ce cas pourra alors être retiré.
			refreshTokenRepository.save(RefreshToken.builder()
					.tokenHash(tokenHash)
					.userId(user.getId())
					.expiresAt(jwtService.extractExpiration(refreshToken))
					.usedAt(now)
					.build());
			return Usage.FIRST_USE;
		}

		if (known.get().getUsedAt().isAfter(now.minus(CONCURRENT_USE_GRACE))) {
			return Usage.CONCURRENT;
		}
		log.warn("🚨 Refresh token déjà consommé présenté pour {} : révocation de toutes ses sessions", user.getEmail());
		userService.revokeTokens(user.getId());
		return Usage.REUSED;
	}

	@Override
	@Transactional
	public void purgeExpired() {
		int deleted = refreshTokenRepository.deleteExpired(clock.instant());
		log.info("{} refresh token(s) expiré(s) supprimé(s)", deleted);
	}

	static String hash(String token) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 indisponible", e);
		}
	}
}
