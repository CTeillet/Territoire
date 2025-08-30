package com.teillet.territoire.controller;

import com.teillet.territoire.service.ISettingService;
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
}
