package com.teillet.territoire.enums;

import org.springframework.security.core.GrantedAuthority;

public enum Role implements GrantedAuthority {
	ADMIN,
	UTILISATEUR,
	GESTIONNAIRE,
	SUPERVISEUR;

	@Override
	public String getAuthority() {
		return "ROLE_" + name();
	}
}
