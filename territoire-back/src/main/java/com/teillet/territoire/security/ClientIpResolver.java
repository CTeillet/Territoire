package com.teillet.territoire.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Détermine l'adresse IP du client derrière le reverse proxy.
 * <p>
 * On retient la <b>dernière</b> valeur de {@code X-Forwarded-For} : c'est celle ajoutée par notre proxy
 * (nginx {@code $proxy_add_x_forwarded_for}). Les premières valeurs peuvent être forgées par le client.
 * À défaut, {@code X-Real-IP} puis l'adresse de la connexion sont utilisées.
 */
public final class ClientIpResolver {
	private ClientIpResolver() {
	}

	public static String resolve(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			String[] parts = forwarded.split(",");
			String last = parts[parts.length - 1].trim();
			if (!last.isEmpty()) {
				return last;
			}
		}
		String realIp = request.getHeader("X-Real-IP");
		if (realIp != null && !realIp.isBlank()) {
			return realIp.trim();
		}
		return request.getRemoteAddr();
	}
}
