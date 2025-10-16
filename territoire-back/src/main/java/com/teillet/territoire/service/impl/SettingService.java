package com.teillet.territoire.service.impl;

import com.teillet.territoire.model.Setting;
import com.teillet.territoire.repository.SettingRepository;
import com.teillet.territoire.service.ISettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SettingService implements ISettingService {

    private final SettingRepository settingRepository;

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
}
