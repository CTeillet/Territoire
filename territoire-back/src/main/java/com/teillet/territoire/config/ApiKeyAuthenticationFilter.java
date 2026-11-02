package com.teillet.territoire.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Authentifie les intégrations externes (tuile Homepage…) par la clé de l'en-tête X-API-Key.
 * Ne s'applique qu'à /api/integrations/** : la clé n'ouvre aucun autre endpoint.
 * Sans clé configurée (ou clé trop courte), les intégrations sont désactivées et répondent 401.
 */
@Component
@Slf4j
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {
	public static final String HEADER = "X-API-Key";
	public static final String PATH_PREFIX = "/api/integrations/";
	public static final String ROLE = "INTEGRATION";
	static final int MIN_KEY_LENGTH = 32;

	private final byte[] apiKey;

	public ApiKeyAuthenticationFilter(@Value("${integrations.api-key:}") String apiKey) {
		if (apiKey.isBlank()) {
			this.apiKey = null;
		} else if (apiKey.length() < MIN_KEY_LENGTH) {
			log.error("Clé d'intégration ignorée : {} caractères minimum (ex. openssl rand -hex 32)", MIN_KEY_LENGTH);
			this.apiKey = null;
		} else {
			this.apiKey = apiKey.getBytes(StandardCharsets.UTF_8);
		}
	}

	@Override
	protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
		return !request.getRequestURI().startsWith(PATH_PREFIX);
	}

	@Override
	protected void doFilterInternal(@NonNull HttpServletRequest request,
	                                @NonNull HttpServletResponse response,
	                                @NonNull FilterChain filterChain) throws ServletException, IOException {
		String providedKey = request.getHeader(HEADER);

		if (apiKey != null && providedKey != null
				// Comparaison en temps constant : la durée ne renseigne pas sur la clé
				&& MessageDigest.isEqual(apiKey, providedKey.getBytes(StandardCharsets.UTF_8))) {
			UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
					"integration", null, List.of(new SimpleGrantedAuthority("ROLE_" + ROLE)));
			SecurityContextHolder.getContext().setAuthentication(authToken);
		} else if (providedKey != null) {
			log.warn("Clé d'intégration refusée pour {}", request.getRequestURI());
		}

		filterChain.doFilter(request, response);
	}
}
