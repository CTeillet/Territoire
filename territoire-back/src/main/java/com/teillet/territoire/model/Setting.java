package com.teillet.territoire.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "setting")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Setting {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private java.util.UUID id;

    @Column(name = "publishers_count")
    private Integer publishersCount;

    @Column(name = "late_reminder_message", columnDefinition = "TEXT")
    private String lateReminderMessage;
}
