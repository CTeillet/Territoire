package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.AddAddressNotToDoDto;
import com.teillet.territoire.model.AddressNotToDo;

public class AddressNotToDoMapper {
	public static AddressNotToDo fromAddAddress(AddAddressNotToDoDto addressNotToDoDto) {
		return AddressNotToDo.builder()
				.city(addressNotToDoDto.getCity())
				.street(addressNotToDoDto.getStreet())
				.number(addressNotToDoDto.getNumber())

				.build();
	}
}
