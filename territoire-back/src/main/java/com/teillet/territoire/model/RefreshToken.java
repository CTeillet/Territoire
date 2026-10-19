package com.teillet.territoire.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Refresh token émis, à usage unique : chaque renouvellement le consomme et en émet un nouveau.
 * <p>
 * Seule l'empreinte SHA-256 du jeton est stockée. Un jeton déjà consommé présenté à nouveau trahit un vol probable :
 * toutes les sessions de l'utilisateur sont alors révoquées (cf. {@code RefreshTokenService}).
 */
@Entity
@Table(name = "refresh_token")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, unique = true, length = 64)
	private String tokenHash;

	@Column(nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private Instant expiresAt;

	/** Date de consommation du jeton, {@code null} tant qu'il n'a pas servi. */
	private Instant usedAt;
}
