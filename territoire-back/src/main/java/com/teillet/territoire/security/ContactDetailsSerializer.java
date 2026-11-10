package com.teillet.territoire.security;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.SerializationContext;
import com.teillet.territoire.enums.Role;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Set;

/**
 * Coordonnées d'une personne (téléphone, e-mail) : écrites en JSON seulement pour les rôles qui attribuent
 * des territoires ou gèrent les personnes. Un UTILISATEUR ne reçoit que les noms, quelle que soit la réponse
 * (liste des personnes, attributions d'un territoire...).
 */
public class ContactDetailsSerializer extends ValueSerializer<String> {
	private static final Set<String> ALLOWED_AUTHORITIES = Set.of(
			Role.ADMIN.getAuthority(), Role.SUPERVISEUR.getAuthority(), Role.GESTIONNAIRE.getAuthority());

	@Override
	public void serialize(String value, JsonGenerator generator, SerializationContext serializers) {
		if (canSeeContactDetails()) {
			generator.writeString(value);
		} else {
			generator.writeNull();
		}
	}

	static boolean canSeeContactDetails() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication != null && authentication.getAuthorities().stream()
				.map(GrantedAuthority::getAuthority)
				.anyMatch(ALLOWED_AUTHORITIES::contains);
	}
}
