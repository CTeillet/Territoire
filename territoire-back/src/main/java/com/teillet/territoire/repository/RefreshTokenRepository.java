package com.teillet.territoire.repository;

import com.teillet.territoire.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
	Optional<RefreshToken> findByTokenHash(String tokenHash);

	/**
	 * Consomme le jeton s'il ne l'a pas encore été. Atomique : sur deux appels simultanés, un seul renvoie 1.
	 */
	@Modifying
	@Query("UPDATE RefreshToken t SET t.usedAt = :now WHERE t.tokenHash = :tokenHash AND t.usedAt IS NULL")
	int markUsed(@Param("tokenHash") String tokenHash, @Param("now") Instant now);

	@Modifying
	@Query("DELETE FROM RefreshToken t WHERE t.expiresAt < :now")
	int deleteExpired(@Param("now") Instant now);
}
