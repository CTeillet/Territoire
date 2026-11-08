package com.teillet.territoire.scheduling;

import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.IRefreshTokenService;
import com.teillet.territoire.service.ITerritoryService;
import com.teillet.territoire.service.ITerritoryStatusHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Traitements de nuit, exécutés dans un ordre garanti :
 * <ol>
 *     <li>passage en retard des attributions échues ;</li>
 *     <li>remise à disposition des territoires en attente depuis plus longtemps que la durée d'attente des paramètres ;</li>
 *     <li>photographie quotidienne des statuts (qui reflète donc l'état à jour) ;</li>
 *     <li>purge des refresh tokens expirés.</li>
 * </ol>
 * Chaque étape est isolée : l'échec de l'une n'empêche pas les suivantes. À la fin, le service de surveillance reçoit
 * un signal de succès ou d'échec (cf. HealthcheckPing) : son absence signale un back arrêté.
 * <p>
 * Remarque : en cas de passage à plusieurs instances du backend, ajouter un verrou distribué (ex. ShedLock).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NightlyJobs {
	private final IAssignmentService assignmentService;
	private final ITerritoryService territoryService;
	private final ITerritoryStatusHistoryService territoryStatusHistoryService;
	private final IRefreshTokenService refreshTokenService;
	private final HealthcheckPing healthcheck;

	@Scheduled(cron = "${territoire.nightly-jobs.cron:0 5 0 * * *}", zone = "Europe/Paris")
	public void run() {
		log.info("🌙 Début des traitements de nuit");
		boolean ok = runStep("vérification des retards", assignmentService::checkOverdueAssignments);
		ok &= runStep("libération des territoires en attente", territoryService::releasePendingTerritories);
		ok &= runStep("historique quotidien des statuts", territoryStatusHistoryService::recordDailyStatistics);
		ok &= runStep("purge des refresh tokens expirés", refreshTokenService::purgeExpired);
		log.info("🌙 Fin des traitements de nuit");
		healthcheck.report(ok);
	}

	private boolean runStep(String name, Runnable step) {
		try {
			step.run();
			return true;
		} catch (Exception e) {
			log.error("Échec du traitement de nuit « {} »", name, e);
			return false;
		}
	}
}
