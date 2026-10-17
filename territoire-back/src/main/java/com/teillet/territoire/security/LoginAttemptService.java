package com.teillet.territoire.security;

import com.teillet.territoire.exception.TooManyRequestsException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Protection anti-brute-force de l'endpoint de connexion (en mémoire, suffisant pour une instance unique).
 * <p>
 * Au-delà de {@code maxFailuresPerAccount} échecs sur un même compte, ou de {@code maxFailuresPerIp} échecs
 * depuis une même adresse IP, dans la fenêtre glissante {@code window}, les tentatives sont refusées (HTTP 429)
 * jusqu'à ce que les échecs les plus anciens sortent de la fenêtre.
 */
@Slf4j
@Component
public class LoginAttemptService {
	private final int maxFailuresPerAccount;
	private final int maxFailuresPerIp;
	private final Duration window;
	private final Clock clock;

	private final Map<String, Deque<Instant>> failuresByKey = new ConcurrentHashMap<>();

	@Autowired
	public LoginAttemptService(
			@Value("${security.login.max-failures-per-account:5}") int maxFailuresPerAccount,
			@Value("${security.login.max-failures-per-ip:20}") int maxFailuresPerIp,
			@Value("${security.login.window-minutes:15}") long windowMinutes) {
		this(maxFailuresPerAccount, maxFailuresPerIp, Duration.ofMinutes(windowMinutes), Clock.systemUTC());
	}

	LoginAttemptService(int maxFailuresPerAccount, int maxFailuresPerIp, Duration window, Clock clock) {
		this.maxFailuresPerAccount = maxFailuresPerAccount;
		this.maxFailuresPerIp = maxFailuresPerIp;
		this.window = window;
		this.clock = clock;
	}

	/**
	 * Lève {@link TooManyRequestsException} si le compte ou l'IP sont temporairement bloqués.
	 */
	public void checkAllowed(String email, String ip) {
		long accountWait = secondsUntilAllowed(accountKey(email), maxFailuresPerAccount);
		long ipWait = secondsUntilAllowed(ipKey(ip), maxFailuresPerIp);
		long wait = Math.max(accountWait, ipWait);
		if (wait > 0) {
			log.warn("Connexion bloquée temporairement (compte={}, ip={})", email, ip);
			throw new TooManyRequestsException(
					"Trop de tentatives de connexion. Réessayez dans " + Math.max(1, (wait + 59) / 60) + " minute(s).", wait);
		}
	}

	public void recordFailure(String email, String ip) {
		Instant now = clock.instant();
		record(accountKey(email), now);
		record(ipKey(ip), now);
	}

	/**
	 * Limitation par adresse IP seule, pour d'autres usages que la connexion (ex. liens personnels invalides).
	 * Le {@code scope} isole les compteurs de chaque usage.
	 */
	public void checkIpAllowed(String scope, String ip) {
		long wait = secondsUntilAllowed(scope + ":" + ipKey(ip), maxFailuresPerIp);
		if (wait > 0) {
			log.warn("Accès bloqué temporairement ({}, ip={})", scope, ip);
			throw new TooManyRequestsException(
					"Trop de tentatives. Réessayez dans " + Math.max(1, (wait + 59) / 60) + " minute(s).", wait);
		}
	}

	public void recordIpFailure(String scope, String ip) {
		record(scope + ":" + ipKey(ip), clock.instant());
	}

	public void recordSuccess(String email) {
		failuresByKey.remove(accountKey(email));
	}

	/**
	 * Purge périodique des entrées expirées pour borner la mémoire utilisée.
	 */
	@Scheduled(fixedDelay = 3_600_000L)
	public void purgeExpired() {
		Instant limit = clock.instant().minus(window);
		failuresByKey.entrySet().removeIf(entry -> {
			synchronized (entry.getValue()) {
				prune(entry.getValue(), limit);
				return entry.getValue().isEmpty();
			}
		});
	}

	private void record(String key, Instant now) {
		Deque<Instant> deque = failuresByKey.computeIfAbsent(key, k -> new ArrayDeque<>());
		synchronized (deque) {
			prune(deque, now.minus(window));
			deque.addLast(now);
		}
	}

	private long secondsUntilAllowed(String key, int maxFailures) {
		Deque<Instant> deque = failuresByKey.get(key);
		if (deque == null) {
			return 0;
		}
		synchronized (deque) {
			Instant now = clock.instant();
			prune(deque, now.minus(window));
			if (deque.size() < maxFailures) {
				return 0;
			}
			// Le blocage est levé quand le plus ancien échec retenu sort de la fenêtre
			Instant oldestRelevant = deque.stream().skip(deque.size() - maxFailures).findFirst().orElse(now);
			return Math.max(1, Duration.between(now, oldestRelevant.plus(window)).toSeconds());
		}
	}

	private static void prune(Deque<Instant> deque, Instant limit) {
		while (!deque.isEmpty() && deque.peekFirst().isBefore(limit)) {
			deque.pollFirst();
		}
	}

	private static String accountKey(String email) {
		return "account:" + (email == null ? "" : email.trim().toLowerCase(Locale.ROOT));
	}

	private static String ipKey(String ip) {
		return "ip:" + (ip == null ? "unknown" : ip);
	}
}
