package com.teillet.territoire.service;

import com.teillet.territoire.dto.AddAddressNotToDoDto;
import com.teillet.territoire.model.AddressNotToDo;

import java.util.UUID;

public interface IAddressNotToDoService {
	AddressNotToDo saveAddressNotToDo(UUID territoryId, AddAddressNotToDoDto addressNotToDoDto);

	AddressNotToDo updateAddressNotToDo(UUID territoryId, UUID addressNotToDoId, AddAddressNotToDoDto addressNotToDoDto);

	AddressNotToDo getAddressNotToDo(UUID territoryId, UUID addressNotToDoId);

	void deleteAddressNotToDo(UUID territoryId, UUID addressId);
}
