package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "address_not_to_do")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressNotToDo {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private UUID id;

	private String street;

	private String number;

	private String zipCode;

	private String city;

	private LocalDate date;

	@ManyToOne
	@JoinColumn(name = "territory_id")
	@JsonBackReference
	private Territory territory;

}
