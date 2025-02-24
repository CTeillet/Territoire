package com.teillet.territoire.dto;

import lombok.Data;

@Data
public class AddAddressNotToDoDto {
	private String street;
	private String number;
	private String zipCode;
	private String city;
}
