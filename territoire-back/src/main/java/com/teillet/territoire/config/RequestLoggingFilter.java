package com.teillet.territoire.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Enumeration;

@Component
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
	                                FilterChain filterChain) throws ServletException, IOException {
		logRequestDetails(request);
		filterChain.doFilter(request, response);
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
	}
}
