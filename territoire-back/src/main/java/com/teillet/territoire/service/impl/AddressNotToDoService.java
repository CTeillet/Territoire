package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.AddAddressNotToDoDto;
import com.teillet.territoire.mapper.AddressNotToDoMapper;
import com.teillet.territoire.model.AddressNotToDo;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AddressNotToDoRepository;
import com.teillet.territoire.service.IAddressNotToDoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AddressNotToDoService implements IAddressNotToDoService {
	private final AddressNotToDoRepository addressNotToDoRepository;
	private final TerritoryService territoryService;

	@Override
	public AddressNotToDo saveAddressNotToDo(UUID territoryId, AddAddressNotToDoDto addressNotToDoDto) {
		AddressNotToDo addressNotToDo = AddressNotToDoMapper.fromAddAddress(addressNotToDoDto);
		Territory territory = territoryService.getTerritory(territoryId);
		addressNotToDo.setTerritory(territory);
		addressNotToDo.setDate(LocalDate.now());
		return addressNotToDoRepository.save(addressNotToDo);
	}

	@Override
	public AddressNotToDo updateAddressNotToDo(UUID territoryId, UUID addressNotToDoId, AddAddressNotToDoDto addressNotToDoDto) {
		AddressNotToDo addressNotToDo = getAddressNotToDo(territoryId, addressNotToDoId);
		addressNotToDo.setCity(addressNotToDoDto.getCity());
		addressNotToDo.setStreet(addressNotToDoDto.getStreet());
		addressNotToDo.setNumber(addressNotToDoDto.getNumber());
		addressNotToDo.setZipCode(addressNotToDoDto.getZipCode());
		return addressNotToDoRepository.save(addressNotToDo);
	}

	@Override
	public AddressNotToDo getAddressNotToDo(UUID territoryId, UUID addressNotToDoId) {
		return addressNotToDoRepository.findByIdAndTerritory_Id(addressNotToDoId, territoryId).orElseThrow(() -> new RuntimeException("Adresse à ne pas faire introuvable"));
	}

	@Override
	public void deleteAddressNotToDo(UUID territoryId, UUID addressId) {
		AddressNotToDo addressNotToDo = getAddressNotToDo(territoryId, addressId);
		addressNotToDoRepository.delete(addressNotToDo);
	}
}
