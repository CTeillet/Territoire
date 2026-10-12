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

    /** Envoi automatique d'un message WhatsApp (avec le lien personnel) à chaque attribution. Null = désactivé. */
    @Column(name = "assignment_notification_enabled")
    private Boolean assignmentNotificationEnabled;

    /** Gabarit Liquid du message envoyé à l'attribution (null = gabarit par défaut). */
    @Column(name = "assignment_message", columnDefinition = "TEXT")
    private String assignmentMessage;

    /** Gabarit Liquid du message d'envoi du lien personnel (null = gabarit par défaut). */
    @Column(name = "access_link_message", columnDefinition = "TEXT")
    private String accessLinkMessage;

    /** Numéro WhatsApp (format international) prévenu à chaque demande de nouveau territoire. Null = pas de message. */
    @Column(name = "territory_request_phone")
    private String territoryRequestPhone;
}
