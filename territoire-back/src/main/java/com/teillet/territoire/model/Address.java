package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
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
	@JsonBackReference
	private Territory territory;

}
