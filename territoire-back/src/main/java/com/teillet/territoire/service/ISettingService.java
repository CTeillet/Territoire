package com.teillet.territoire.service;

import com.teillet.territoire.dto.AccessSettingsDto;

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
}
