package com.teillet.territoire.controller;

import com.teillet.territoire.dto.TerritoryReminderDto;
import com.teillet.territoire.service.ITerritoryReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/territory-reminders")
@RequiredArgsConstructor
@Slf4j
public class TerritoryReminderController {

    private final ITerritoryReminderService territoryReminderService;

    @PostMapping
    public ResponseEntity<TerritoryReminderDto> createReminder(
            @RequestParam UUID territoryId,
            @RequestParam UUID personId,
            @RequestParam UUID remindedById,
            @RequestParam(required = false) String notes) {
        log.info("Création d'un rappel pour le territoire {} et la personne {}", territoryId, personId);
        TerritoryReminderDto reminder = territoryReminderService.createReminder(territoryId, personId, remindedById, notes);
        return new ResponseEntity<>(reminder, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<TerritoryReminderDto>> getAllReminders() {
        log.info("Récupération de tous les rappels");
        List<TerritoryReminderDto> reminders = territoryReminderService.getAllReminders();
        return ResponseEntity.ok(reminders);
    }

    @GetMapping("/territory/{territoryId}")
    public ResponseEntity<List<TerritoryReminderDto>> getRemindersByTerritory(@PathVariable UUID territoryId) {
        log.info("Récupération des rappels pour le territoire {}", territoryId);
        List<TerritoryReminderDto> reminders = territoryReminderService.getRemindersByTerritory(territoryId);
        return ResponseEntity.ok(reminders);
    }

    @GetMapping("/person/{personId}")
    public ResponseEntity<List<TerritoryReminderDto>> getRemindersByPerson(@PathVariable UUID personId) {
        log.info("Récupération des rappels pour la personne {}", personId);
        List<TerritoryReminderDto> reminders = territoryReminderService.getRemindersByPerson(personId);
        return ResponseEntity.ok(reminders);
    }

    @GetMapping("/check")
    public ResponseEntity<Boolean> hasReminder(
            @RequestParam UUID territoryId,
            @RequestParam UUID personId) {
        log.info("Vérification de l'existence d'un rappel pour le territoire {} et la personne {}", territoryId, personId);
        boolean hasReminder = territoryReminderService.hasReminder(territoryId, personId);
        return ResponseEntity.ok(hasReminder);
    }
}