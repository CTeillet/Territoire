package com.teillet.territoire.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestTemplate;

@Configuration
public class ConfigUtils {

	/** Horloge du fuseau de la JVM (Europe/Paris en production), injectable pour les tests. */
	@Bean
	public java.time.Clock clock() {
		return java.time.Clock.systemDefaultZone();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public RestTemplate restTemplate() {
		var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(java.time.Duration.ofSeconds(5));
		factory.setReadTimeout(java.time.Duration.ofSeconds(10));
		return new RestTemplate(factory);
	}

}
