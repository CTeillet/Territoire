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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TerritoryReminderService implements ITerritoryReminderService {

    private Person getAuthenticatedPerson() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalStateException("Utilisateur non authentifié");
        }
        String email = authentication.getName();
        return personRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Aucune personne liée à l'utilisateur authentifié"));
    }

    private final TerritoryReminderRepository territoryReminderRepository;
    private final ITerritoryService territoryService;
    private final IPersonService personService;
    private final IWahaClient wahaClient;
    private final com.teillet.territoire.repository.PersonRepository personRepository;

    @Override
    @Transactional
    public TerritoryReminderDto createReminder(UUID territoryId, UUID personId, String notes) {
        Territory territory = territoryService.getTerritory(territoryId);
        
        // Check if territory is late
        if (territory.getStatus() != TerritoryStatus.LATE) {
            throw new IllegalStateException("Le territoire n'est pas en retard");
        }
        
        Person person = personService.getPerson(personId);
        Person remindedBy = getAuthenticatedPerson();
        
        // Check if reminder already exists
        if (hasReminder(territoryId, personId)) {
            throw new IllegalStateException("Un rappel a déjà été envoyé pour ce territoire et cette personne");
        }
        
        TerritoryReminder reminder = TerritoryReminder.builder()
                .territory(territory)
                .person(person)
                .reminderDate(LocalDate.now())
                .notes(notes)
                .build();
        
        TerritoryReminder savedReminder = territoryReminderRepository.save(reminder);
        log.info("Rappel créé pour le territoire {} et la personne {}", territory.getName(), 
                person.getFirstName() + " " + person.getLastName());
        
        return TerritoryReminderMapper.toDto(savedReminder);
    }

    @Override
    @Transactional
    public TerritoryReminderDto sendWhatsAppReminder(UUID territoryId, UUID personId, String message) {
        Territory territory = territoryService.getTerritory(territoryId);

        if (territory.getStatus() != TerritoryStatus.LATE) {
            throw new IllegalStateException("Le territoire n'est pas en retard");
        }

        Person person = personService.getPerson(personId);

        if (person.getPhoneNumber() == null || person.getPhoneNumber().isBlank()) {
            throw new IllegalStateException("Aucun numéro de téléphone pour la personne");
        }
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("Le message ne peut pas être vide");
        }

        // send WhatsApp message
        wahaClient.sendMessage(person.getPhoneNumber(), message);

        // persist reminder with messageSend
        TerritoryReminder reminder = TerritoryReminder.builder()
                .territory(territory)
                .person(person)
                .reminderDate(LocalDate.now())
                .messageSend(message)
                .build();

        TerritoryReminder saved = territoryReminderRepository.save(reminder);
        log.info("Rappel WhatsApp envoyé à {} pour le territoire {}", person.getPhoneNumber(), territory.getName());
        return TerritoryReminderMapper.toDto(saved);
    }

    @Override
    public List<TerritoryReminderDto> getRemindersByTerritory(UUID territoryId) {
        // Verify territory exists
        territoryService.getTerritory(territoryId);
        
        List<TerritoryReminder> reminders = territoryReminderRepository.findByTerritory_Id(territoryId);
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
        return territoryReminderRepository.existsByTerritory_IdAndPerson_Id(territoryId, personId);
    }
}