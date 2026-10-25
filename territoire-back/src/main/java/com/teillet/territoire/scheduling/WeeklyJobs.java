package com.teillet.territoire.scheduling;

import com.teillet.territoire.service.ILateTerritoryReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Traitements hebdomadaires. Le lundi matin, après les traitements de nuit : les statuts « en retard » sont à jour.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WeeklyJobs {
	private final ILateTerritoryReportService lateTerritoryReportService;

	@Scheduled(cron = "${territoire.late-report.cron:0 0 8 * * MON}", zone = "Europe/Paris")
	public void sendLateTerritoryReport() {
		try {
			lateTerritoryReportService.sendWeeklyReport();
		} catch (Exception e) {
			log.error("Échec de l'envoi hebdomadaire du récapitulatif des retards", e);
		}
	}
}
