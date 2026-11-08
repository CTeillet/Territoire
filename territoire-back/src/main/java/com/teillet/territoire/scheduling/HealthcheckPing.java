package com.teillet.territoire.scheduling;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Signal des traitements de nuit à un service de surveillance (healthchecks.io, comme la sauvegarde) : il prévient par
 * e-mail quand le signal manque (back arrêté) ou annonce un échec. Sans adresse
 * ({@code territoire.nightly-jobs.healthcheck-url}), rien n'est envoyé.
 */
@Slf4j
@Component
public class HealthcheckPing {
	private static final Duration TIMEOUT = Duration.ofSeconds(10);

	private final String url;
	private final HttpClient http;

	public HealthcheckPing(@Value("${territoire.nightly-jobs.healthcheck-url:}") String url) {
		this.url = url == null ? "" : url.strip().replaceAll("/+$", "");
		this.http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
	}

	/** Succès : l'adresse ; échec : l'adresse suivie de /fail (convention de healthchecks.io). */
	public void report(boolean success) {
		if (url.isEmpty()) {
			return;
		}
		String target = success ? url : url + "/fail";
		try {
			HttpResponse<Void> response = http.send(HttpRequest.newBuilder(URI.create(target)).timeout(TIMEOUT).GET().build(),
					HttpResponse.BodyHandlers.discarding());
			if (response.statusCode() >= 300) {
				log.warn("Signal de surveillance refusé : HTTP {}", response.statusCode());
			}
		} catch (Exception e) {
			if (e instanceof InterruptedException) {
				Thread.currentThread().interrupt();
			}
			log.warn("Signal de surveillance impossible : {}", e.getMessage());
		}
	}

	boolean isEnabled() {
		return !url.isEmpty();
	}
}
