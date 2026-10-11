package com.teillet.territoire.config;

import com.teillet.territoire.model.User;
import com.teillet.territoire.service.IJwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Objects;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {
	private final IJwtService jwtService;
	private final UserDetailsService userDetailsService;

	@Override
	protected void doFilterInternal(HttpServletRequest request,
	                                @NonNull HttpServletResponse response,
	                                @NonNull FilterChain filterChain) throws ServletException, IOException {
		String authHeader = request.getHeader("Authorization");

		if (authHeader == null || !authHeader.startsWith("Bearer ")) {
			filterChain.doFilter(request, response);
			return;
		}

		String token = authHeader.substring(7);
		String email = jwtService.extractEmail(token);

		if (email == null) {
			// Token invalide ou expiré : la requête reste anonyme et sera rejetée en 401 sur /api/**
			log.debug("Token JWT invalide ou expiré");
		} else if (SecurityContextHolder.getContext().getAuthentication() == null) {
			try {
				UserDetails userDetails = userDetailsService.loadUserByUsername(email);

				if (jwtService.validateToken(token) && hasCurrentVersion(token, userDetails)) {
					UsernamePasswordAuthenticationToken authToken =
							new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

					authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
					SecurityContextHolder.getContext().setAuthentication(authToken);
				} else {
					log.warn("Token JWT refusé (type ou version invalide) pour : {}", email);
				}
			} catch (Exception e) {
				log.warn("Échec du chargement de l'utilisateur '{}' : {}", email, e.getMessage());
			}
		}

		filterChain.doFilter(request, response);
	}

	/**
	 * Un token émis avant une révocation (changement de rôle, déconnexion...) n'est plus accepté.
	 */
	private boolean hasCurrentVersion(String token, UserDetails userDetails) {
		if (!(userDetails instanceof User user)) {
			return true;
		}
		return Objects.equals(jwtService.extractTokenVersion(token), user.getCurrentTokenVersion());
	}
}
