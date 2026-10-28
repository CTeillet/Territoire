package com.teillet.territoire.service;

import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.dto.DurationSettingsDto;

import java.util.List;

public interface ISettingService {
    Integer getPublishersCount();
    Integer updatePublishersCount(Integer count);

    String getLateReminderMessage();
    String updateLateReminderMessage(String message);

    /** Réglages de l'accès numérique ; les gabarits non personnalisés valent leur valeur par défaut. */
    AccessSettingsDto getAccessSettings();

    /**
     * @throws IllegalArgumentException si un gabarit est invalide
     */
    AccessSettingsDto updateAccessSettings(AccessSettingsDto settings);

    /** Destinataires du récapitulatif hebdomadaire des territoires en retard (liste vide = aucun envoi). */
    List<String> getLateReportRecipients();

    /** Remplace les destinataires ; les doublons et adresses vides sont retirés. */
    List<String> updateLateReportRecipients(List<String> recipients);

    /** Durées d'attribution et d'attente (4 mois chacune tant qu'elles n'ont pas été réglées). */
    DurationSettingsDto getDurationSettings();

    DurationSettingsDto updateDurationSettings(DurationSettingsDto durations);
}
