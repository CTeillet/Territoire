package com.teillet.territoire.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "address")
public class Address {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	private String street;

	private String number;

	private String zipCode;

	private String city;

	@ManyToOne
	@JoinColumn(name = "territory_id")
	private Territory territory;

}
