package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.dto.DurationSettingsDto;
import com.teillet.territoire.model.Setting;
import com.teillet.territoire.repository.SettingRepository;
import com.teillet.territoire.service.ISettingService;
import com.teillet.territoire.utils.MessageTemplateRenderer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
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

    /** Durée d'attribution et d'attente tant qu'elles n'ont pas été réglées dans les paramètres. */
    public static final int DEFAULT_DURATION_MONTHS = 4;

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

    @Override
    public List<String> getLateReportRecipients() {
        String stored = getSingleton().getLateReportRecipients();
        return stored == null ? List.of() : normalizeRecipients(Arrays.asList(stored.split(",")));
    }

    @Override
    public List<String> updateLateReportRecipients(List<String> recipients) {
        List<String> normalized = normalizeRecipients(recipients == null ? List.of() : recipients);
        Setting s = getSingleton();
        s.setLateReportRecipients(normalized.isEmpty() ? null : String.join(",", normalized));
        settingRepository.save(s);
        return normalized;
    }

    @Override
    public DurationSettingsDto getDurationSettings() {
        Setting s = getSingleton();
        return DurationSettingsDto.builder()
                .assignmentDurationMonths(Optional.ofNullable(s.getAssignmentDurationMonths()).orElse(DEFAULT_DURATION_MONTHS))
                .pendingDurationMonths(Optional.ofNullable(s.getPendingDurationMonths()).orElse(DEFAULT_DURATION_MONTHS))
                .build();
    }

    @Override
    public DurationSettingsDto updateDurationSettings(DurationSettingsDto durations) {
        Setting s = getSingleton();
        s.setAssignmentDurationMonths(durations.getAssignmentDurationMonths());
        s.setPendingDurationMonths(durations.getPendingDurationMonths());
        settingRepository.save(s);
        return getDurationSettings();
    }

    private static List<String> normalizeRecipients(List<String> recipients) {
        return recipients.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(r -> !r.isEmpty())
                .distinct()
                .toList();
    }

    private static String orDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
