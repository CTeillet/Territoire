package com.teillet.territoire.service;

import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.dto.DurationSettingsDto;
import com.teillet.territoire.dto.MapThemeSettingsDto;
import com.teillet.territoire.enums.MapView;
import com.teillet.territoire.enums.PlanTheme;

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

    /** Thèmes du Plan IGN de chaque carte ; une carte jamais réglée a ses thèmes par défaut. */
    MapThemeSettingsDto getMapThemes();

    /** Thèmes d'une carte, dans l'ordre des thèmes. */
    List<PlanTheme> getMapThemes(MapView view);

    /** Remplace les thèmes des cartes données ; les autres gardent les leurs. */
    MapThemeSettingsDto updateMapThemes(MapThemeSettingsDto settings);
}
