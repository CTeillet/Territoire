package com.teillet.territoire.security;

import com.teillet.territoire.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

class LoginAttemptServiceTest {

	/**
	 * Horloge manipulable pour simuler l'écoulement du temps.
	 */
	private static final class MutableClock extends Clock {
		private Instant now = Instant.parse("2026-01-01T10:00:00Z");

		void advance(Duration duration) {
			now = now.plus(duration);
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return now;
		}
	}

	private final MutableClock clock = new MutableClock();
	private final LoginAttemptService service = new LoginAttemptService(3, 5, Duration.ofMinutes(15), clock);

	@Test
	void blocksAccountAfterMaxFailures() {
		for (int i = 0; i < 3; i++) {
			assertDoesNotThrow(() -> service.checkAllowed("user@test.fr", "1.1.1.1"));
			service.recordFailure("user@test.fr", "1.1.1.1");
		}

		TooManyRequestsException ex = assertThrows(TooManyRequestsException.class,
				() -> service.checkAllowed("User@Test.fr ", "2.2.2.2"));
		assertTrue(ex.getRetryAfterSeconds() > 0);

		// Un autre compte depuis une autre IP n'est pas impacté
		assertDoesNotThrow(() -> service.checkAllowed("other@test.fr", "2.2.2.2"));
	}

	@Test
	void unblocksAfterWindow() {
		for (int i = 0; i < 3; i++) {
			service.recordFailure("user@test.fr", "1.1.1.1");
		}
		assertThrows(TooManyRequestsException.class, () -> service.checkAllowed("user@test.fr", "1.1.1.1"));

		clock.advance(Duration.ofMinutes(16));
		assertDoesNotThrow(() -> service.checkAllowed("user@test.fr", "1.1.1.1"));
	}

	@Test
	void successResetsAccountCounter() {
		service.recordFailure("user@test.fr", "1.1.1.1");
		service.recordFailure("user@test.fr", "1.1.1.1");
		service.recordSuccess("user@test.fr");
		service.recordFailure("user@test.fr", "1.1.1.1");

		assertDoesNotThrow(() -> service.checkAllowed("user@test.fr", "3.3.3.3"));
	}

	@Test
	void blocksIpAfterMaxFailuresAcrossAccounts() {
		for (int i = 0; i < 5; i++) {
			service.recordFailure("user" + i + "@test.fr", "9.9.9.9");
		}
		assertThrows(TooManyRequestsException.class, () -> service.checkAllowed("new@test.fr", "9.9.9.9"));
		assertDoesNotThrow(() -> service.checkAllowed("new@test.fr", "8.8.8.8"));
	}

	@Test
	void purgeRemovesExpiredEntries() {
		service.recordFailure("user@test.fr", "1.1.1.1");
		clock.advance(Duration.ofHours(1));
		assertDoesNotThrow(service::purgeExpired);
		assertDoesNotThrow(() -> service.checkAllowed("user@test.fr", "1.1.1.1"));
	}

	@Test
	void ipScope_BlocksAfterTooManyFailures_AndIsIsolatedFromLogin() {
		for (int i = 0; i < 5; i++) {
			service.recordIpFailure("lien-public", "1.2.3.4");
		}

		assertThrows(TooManyRequestsException.class, () -> service.checkIpAllowed("lien-public", "1.2.3.4"));
		// Les autres usages et les autres IP ne sont pas touchés
		assertDoesNotThrow(() -> service.checkIpAllowed("autre", "1.2.3.4"));
		assertDoesNotThrow(() -> service.checkIpAllowed("lien-public", "5.6.7.8"));
		assertDoesNotThrow(() -> service.checkAllowed("someone@example.com", "1.2.3.4"));

		clock.advance(Duration.ofMinutes(16));
		assertDoesNotThrow(() -> service.checkIpAllowed("lien-public", "1.2.3.4"));
	}
}
