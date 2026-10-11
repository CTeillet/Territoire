package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.teillet.territoire.enums.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
// Les propriétés techniques de UserDetails ne doivent jamais être exposées dans l'API
@JsonIgnoreProperties(value = {"authorities", "accountNonExpired", "accountNonLocked", "credentialsNonExpired", "enabled", "tokenVersion"})
public class User implements UserDetails {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(unique = true, nullable = false)
	private String email;

	/**
	 * Hash BCrypt du mot de passe : ne doit jamais être sérialisé vers le client.
	 */
	@JsonIgnore
	@Column(nullable = false)
	private String password;

	@Column(nullable = false)
	private String username;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Role role;

	/**
	 * Version des jetons de l'utilisateur. L'incrémenter révoque tous les jetons (accès et refresh) déjà émis.
	 * Nullable pour rester compatible avec les lignes existantes (null = 0).
	 */
	@JsonIgnore
	@Column(name = "token_version")
	private Integer tokenVersion;

	@JsonIgnore
	public int getCurrentTokenVersion() {
		return tokenVersion == null ? 0 : tokenVersion;
	}

	public void incrementTokenVersion() {
		this.tokenVersion = getCurrentTokenVersion() + 1;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return Collections.singleton(role); // Retourne le rôle de l'utilisateur
	}

}
