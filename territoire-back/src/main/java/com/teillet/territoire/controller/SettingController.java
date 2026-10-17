package com.teillet.territoire.controller;

import com.teillet.territoire.dto.AccessSettingsDto;
import com.teillet.territoire.service.ISettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
class SettingController {

    private final ISettingService settingService;

    @GetMapping("/publishers-count")
    public ResponseEntity<Integer> getPublishersCount() {
        return ResponseEntity.ok(settingService.getPublishersCount());
    }

    @PutMapping("/publishers-count")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
    public ResponseEntity<Integer> updatePublishersCount(@RequestBody Integer count) {
        if (count == null || count < 0) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(settingService.updatePublishersCount(count));
    }

    @GetMapping("/late-reminder-message")
    public ResponseEntity<String> getLateReminderMessage() {
        return ResponseEntity.ok(settingService.getLateReminderMessage());
    }

    @PutMapping("/late-reminder-message")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
    public ResponseEntity<String> updateLateReminderMessage(@RequestBody String message) {
        // Allow empty message to reset; trim excessive whitespace
        String sanitized = message == null ? "" : message.trim();
        return ResponseEntity.ok(settingService.updateLateReminderMessage(sanitized));
    }

    @GetMapping("/acces-numerique")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
    public ResponseEntity<AccessSettingsDto> getAccessSettings() {
        return ResponseEntity.ok(settingService.getAccessSettings());
    }

    @PutMapping("/acces-numerique")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPERVISEUR')")
    public ResponseEntity<AccessSettingsDto> updateAccessSettings(@Valid @RequestBody AccessSettingsDto settings) {
        return ResponseEntity.ok(settingService.updateAccessSettings(settings));
    }
}
