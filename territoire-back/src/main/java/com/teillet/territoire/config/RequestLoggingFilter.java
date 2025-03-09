package com.teillet.territoire.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Enumeration;
import java.util.stream.Collectors;

@Component
@Slf4j
@RequiredArgsConstructor
public class RequestLoggingFilter extends OncePerRequestFilter {
	@Value("${territoire.log-request-details}")
	private Boolean logRequestDetails;

	@Override
	protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
	                                @NonNull FilterChain filterChain) throws ServletException, IOException {
		if (logRequestDetails.equals(Boolean.TRUE)) {
			CachedBodyHttpServletRequest cachedRequest = new CachedBodyHttpServletRequest(request);
			logRequestDetails(cachedRequest);
			filterChain.doFilter(cachedRequest, response);
		} else {
			filterChain.doFilter(request, response);
		}
	}

	private void logRequestDetails(HttpServletRequest request) {
		log.info("Incoming request: {} {}", request.getMethod(), request.getRequestURI());

		// Logger les headers
		Enumeration<String> headerNames = request.getHeaderNames();
		while (headerNames.hasMoreElements()) {
			String headerName = headerNames.nextElement();
			log.info("Header: {} = {}", headerName, request.getHeader(headerName));
		}

		// Logger les paramètres de requête
		request.getParameterMap().forEach((key, value) -> log.info("Param: {} = {}", key, String.join(",", value)));

		// Logger le body (si la requête a un corps)
		try {
			String body = request.getReader().lines().collect(Collectors.joining(System.lineSeparator()));
			if (!body.isBlank()) {
				log.info("Body: {}", body);
			}
		} catch (IOException e) {
			log.warn("Impossible de lire le body de la requête", e);
		}
	}
}
