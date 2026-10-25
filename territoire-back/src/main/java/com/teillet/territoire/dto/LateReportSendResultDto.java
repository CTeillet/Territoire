package com.teillet.territoire.dto;

import java.util.List;

/**
 * Résultat de l'envoi du récapitulatif des territoires en retard.
 *
 * @param lateTerritories nombre de territoires en retard listés
 * @param recipients      adresses auxquelles l'e-mail a été envoyé
 */
public record LateReportSendResultDto(int lateTerritories, List<String> recipients) {
}
