package com.teillet.territoire.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class TerritoryReminder {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    private LocalDate reminderDate;

    private String notes;

    @Column(name = "message_send", columnDefinition = "TEXT")
    private String messageSend;

    // New: support for multiple territories in the same reminder (for WhatsApp bulk reminders)
    @ManyToMany
    @JoinTable(
            name = "territory_reminder_territories",
            joinColumns = @JoinColumn(name = "reminder_id"),
            inverseJoinColumns = @JoinColumn(name = "territory_id")
    )
    @ToString.Exclude
    private List<Territory> territories = new ArrayList<>();
}