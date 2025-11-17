package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.TerritoryReminderDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.mapper.TerritoryReminderMapper;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.model.TerritoryReminder;
import com.teillet.territoire.repository.TerritoryReminderRepository;
import com.teillet.territoire.service.IPersonService;
import com.teillet.territoire.service.ITerritoryReminderService;
import com.teillet.territoire.service.ITerritoryService;
import com.teillet.territoire.service.IWahaClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TerritoryReminderService implements ITerritoryReminderService {

    private final TerritoryReminderRepository territoryReminderRepository;
    private final ITerritoryService territoryService;
    private final IPersonService personService;
    private final IWahaClient wahaClient;

	@Override
    @Transactional
    public TerritoryReminderDto createReminder(List<UUID> territoryIds, UUID personId, String notes) {
        List<Territory> territories = territoryIds.stream()
                .map(territoryService::getTerritory)
                .collect(Collectors.toList());

        Person person = personService.getPerson(personId);

        // Si tous les territoires fournis ont déjà un rappel pour cette personne, on bloque
        boolean allAlreadyReminded = territories.stream()
                .allMatch(t -> territoryReminderRepository.existsByTerritories_IdAndPerson_Id(t.getId(), personId));
        if (allAlreadyReminded) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tous les territoires sélectionnés ont déjà un rappel pour cette personne");
        }

        TerritoryReminder reminder = TerritoryReminder.builder()
                .territories(territories)
                .person(person)
                .reminderDate(LocalDate.now())
                .notes(notes)
                .build();
        
        TerritoryReminder savedReminder = territoryReminderRepository.save(reminder);
        log.info("Rappel créé pour le territoire {} et la personne {}", territories,
                person.getFirstName() + " " + person.getLastName());
        
        return TerritoryReminderMapper.toDto(savedReminder);
    }

    @Override
    @Transactional
    public TerritoryReminderDto sendWhatsAppReminder(List<UUID> territoryIds, UUID personId, String message) {
        if (territoryIds == null || territoryIds.isEmpty()) {
            throw new IllegalArgumentException("La liste des territoires ne peut pas être vide");
        }

        Person person = personService.getPerson(personId);
        if (person.getPhoneNumber() == null || person.getPhoneNumber().isBlank()) {
            throw new IllegalStateException("Aucun numéro de téléphone pour la personne");
        }
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("Le message ne peut pas être vide");
        }

        // Load and validate territories
        List<Territory> territories = territoryIds.stream()
                .map(territoryService::getTerritory)
                .collect(Collectors.toList());

        for (Territory t : territories) {
            if (t.getStatus() != TerritoryStatus.LATE) {
                throw new IllegalStateException("Le territoire n'est pas en retard: " + t.getName());
            }
        }

        // Bloquer si tous les territoires de la requête ont déjà un rappel pour cette personne
        boolean allAlreadyReminded = territories.stream()
                .allMatch(t -> territoryReminderRepository.existsByTerritories_IdAndPerson_Id(t.getId(), personId));
        if (allAlreadyReminded) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tous les territoires sélectionnés ont déjà un rappel pour cette personne");
        }

        // send WhatsApp message once
        wahaClient.sendMessage(person.getPhoneNumber(), message);

        // persist reminder with messageSend and territories list
        TerritoryReminder reminder = TerritoryReminder.builder()
                .person(person)
                .reminderDate(LocalDate.now())
                .messageSend(message)
                .territories(territories)
                .build();

        TerritoryReminder saved = territoryReminderRepository.save(reminder);
        log.info("Rappel WhatsApp envoyé à {} pour {} territoire(s)", person.getPhoneNumber(), territories.size());
        return TerritoryReminderMapper.toDto(saved);
    }

    @Override
    public List<TerritoryReminderDto> getRemindersByTerritory(UUID territoryId) {
        // Verify territory exists
        territoryService.getTerritory(territoryId);
        
        List<TerritoryReminder> reminders = territoryReminderRepository.findByTerritories_Id(territoryId);
        return reminders.stream()
                .map(TerritoryReminderMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<TerritoryReminderDto> getRemindersByPerson(UUID personId) {
        // Verify person exists
        personService.getPerson(personId);
        
        List<TerritoryReminder> reminders = territoryReminderRepository.findByPerson_Id(personId);
        return reminders.stream()
                .map(TerritoryReminderMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<TerritoryReminderDto> getAllReminders() {
        List<TerritoryReminder> reminders = territoryReminderRepository.findAll();
        return reminders.stream()
                .map(TerritoryReminderMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public boolean hasReminder(UUID territoryId, UUID personId) {
        return territoryReminderRepository.existsByTerritories_IdAndPerson_Id(territoryId, personId);
    }
}