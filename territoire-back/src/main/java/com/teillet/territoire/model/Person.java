package com.teillet.territoire.model;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.teillet.territoire.security.ContactDetailsSerializer;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Person {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	private String firstName;
	private String lastName;

	// Coordonnées : absentes des logs (toString) et du JSON envoyé à un UTILISATEUR
	@ToString.Exclude
	@JsonSerialize(using = ContactDetailsSerializer.class)
	private String phoneNumber;

	@ToString.Exclude
	@JsonSerialize(using = ContactDetailsSerializer.class)
	private String email;
}
