package com.teillet.territoire.service;

public interface ISettingService {
    Integer getPublishersCount();
    Integer updatePublishersCount(Integer count);

    String getLateReminderMessage();
    String updateLateReminderMessage(String message);
}
