package com.teillet.territoire.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TerritoryReminder {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "territory_id", nullable = false)
    private Territory territory;

    @ManyToOne
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @ManyToOne
    @JoinColumn(name = "reminded_by_id", nullable = false)
    private Person remindedBy;

    private LocalDate reminderDate;

    private String notes;

    @Override
    public String toString() {
        return "TerritoryReminder{" +
                "id=" + id +
                ", territory=" + (territory != null ? territory.getId() : null) +
                ", person=" + (person != null ? person.getId() : null) +
                ", remindedBy=" + (remindedBy != null ? remindedBy.getId() : null) +
                ", reminderDate=" + reminderDate +
                ", notes='" + notes + '\'' +
                '}';
    }
}