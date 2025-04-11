package com.teillet.territoire.model;

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
	private String phoneNumber;
	private String email;
}
