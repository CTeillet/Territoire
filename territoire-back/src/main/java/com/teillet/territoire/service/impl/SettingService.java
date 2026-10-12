package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.model.Setting;
import com.teillet.territoire.repository.SettingRepository;
import com.teillet.territoire.service.ISettingService;
import com.teillet.territoire.utils.MessageTemplateRenderer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SettingService implements ISettingService {

    public static final String DEFAULT_ASSIGNMENT_MESSAGE = """
            Bonjour {{ person.firstName }},

            Le territoire {{ territory.name }}{% if territory.city %} ({{ territory.city }}){% endif %} t'a été attribué, à rendre avant le {{ territory.dueDate }}.

            Retrouve tes territoires (carte, adresses à ne pas visiter) et rends-les quand tu as terminé :
            {{ link }}""";

    public static final String DEFAULT_ACCESS_LINK_MESSAGE = """
            Bonjour {{ person.firstName }},

            Voici ton lien personnel pour consulter tes territoires (carte, adresses à ne pas visiter) et les rendre quand tu as terminé :
            {{ link }}

            Ce lien t'est réservé, merci de ne pas le partager.""";

    private final SettingRepository settingRepository;
    private final MessageTemplateRenderer templateRenderer;

    private Setting getSingleton() {
        Optional<Setting> existing = settingRepository.findAll().stream().findFirst();
        return existing.orElseGet(() -> settingRepository.save(Setting.builder().publishersCount(0).build()));
    }

    @Override
    public Integer getPublishersCount() {
        return Optional.ofNullable(getSingleton().getPublishersCount()).orElse(0);
    }

    @Override
    public Integer updatePublishersCount(Integer count) {
        Setting s = getSingleton();
        s.setPublishersCount(count);
        settingRepository.save(s);
        return s.getPublishersCount();
    }

    @Override
    public String getLateReminderMessage() {
        return Optional.ofNullable(getSingleton().getLateReminderMessage()).orElse("");
    }

    @Override
    public String updateLateReminderMessage(String message) {
        Setting s = getSingleton();
        s.setLateReminderMessage(message);
        settingRepository.save(s);
        return s.getLateReminderMessage();
    }

    @Override
    public AccessSettingsDto getAccessSettings() {
        Setting s = getSingleton();
        return AccessSettingsDto.builder()
                .assignmentNotificationEnabled(Boolean.TRUE.equals(s.getAssignmentNotificationEnabled()))
                .assignmentMessage(orDefault(s.getAssignmentMessage(), DEFAULT_ASSIGNMENT_MESSAGE))
                .accessLinkMessage(orDefault(s.getAccessLinkMessage(), DEFAULT_ACCESS_LINK_MESSAGE))
                .territoryRequestPhone(s.getTerritoryRequestPhone())
                .build();
    }

    @Override
    public AccessSettingsDto updateAccessSettings(AccessSettingsDto settings) {
        templateRenderer.validate(settings.getAssignmentMessage());
        templateRenderer.validate(settings.getAccessLinkMessage());
        Setting s = getSingleton();
        s.setAssignmentNotificationEnabled(settings.isAssignmentNotificationEnabled());
        // Un gabarit vide revient au gabarit par défaut
        s.setAssignmentMessage(blankToNull(settings.getAssignmentMessage()));
        s.setAccessLinkMessage(blankToNull(settings.getAccessLinkMessage()));
        s.setTerritoryRequestPhone(blankToNull(settings.getTerritoryRequestPhone()));
        settingRepository.save(s);
        return getAccessSettings();
    }

    private static String orDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
