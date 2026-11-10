package com.teillet.territoire.repository;

import com.teillet.territoire.model.Setting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface SettingRepository extends JpaRepository<Setting, UUID> {

	/**
	 * Suivi des envois WhatsApp : mise à jour de ces seules colonnes, pour ne jamais écraser un réglage enregistré au
	 * même moment par un administrateur (save() réécrirait toute la ligne).
	 */
	@Modifying(clearAutomatically = true)
	@Query("update Setting s set s.whatsappLastSuccessAt = :at")
	int recordWhatsAppSuccess(@Param("at") Instant at);

	@Modifying(clearAutomatically = true)
	@Query("update Setting s set s.whatsappLastFailureAt = :at, s.whatsappLastFailure = :failure")
	int recordWhatsAppFailure(@Param("at") Instant at, @Param("failure") String failure);
}
