package com.teillet.territoire.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.stream.Collectors;

@Slf4j
@Component
public class RoleLoggingInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

		if (authentication != null) {
			String username = authentication.getName();
			String roles = authentication.getAuthorities().stream()
					.map(GrantedAuthority::getAuthority)
					.collect(Collectors.joining(", "));

			log.info("Utilisateur '{}' avec rôles : {}", username, roles);
		} else {
			log.warn("Aucune authentication trouvée pour la requête.");
		}

		return true;
	}
}
