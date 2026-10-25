package com.teillet.territoire.service;

import com.teillet.territoire.dto.LateReportSendResultDto;
import com.teillet.territoire.dto.LateReportSettingsDto;

/**
 * Récapitulatif par e-mail des territoires en retard.
 */
public interface ILateTerritoryReportService {
	/** Un serveur SMTP est configuré : sans lui, aucun e-mail ne part. */
	boolean isMailConfigured();

	LateReportSettingsDto getSettings();

	/** Enregistre les destinataires ({@code mailConfigured} est ignoré). */
	LateReportSettingsDto updateSettings(LateReportSettingsDto settings);

	/**
	 * Envoie tout de suite le récapitulatif aux destinataires enregistrés.
	 *
	 * @throws IllegalStateException si le serveur SMTP ou les destinataires manquent, ou si l'envoi échoue
	 */
	LateReportSendResultDto sendReport();

	/** Envoi planifié : se contente de le journaliser tant que le serveur SMTP ou les destinataires manquent. */
	void sendWeeklyReport();
}
