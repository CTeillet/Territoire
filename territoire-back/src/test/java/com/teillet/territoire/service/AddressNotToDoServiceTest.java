package com.teillet.territoire.service;

import com.teillet.territoire.dto.AddAddressNotToDoDto;
import com.teillet.territoire.model.AddressNotToDo;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.AddressNotToDoRepository;
import com.teillet.territoire.service.impl.AddressNotToDoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AddressNotToDoServiceTest {

	@Mock
	private AddressNotToDoRepository addressNotToDoRepository;

	@Mock
	private ITerritoryService territoryService;

	@InjectMocks
	private AddressNotToDoService addressNotToDoService;

	private UUID territoryId;
	private UUID addressId;
	private Territory territory;

	@BeforeEach
	void setUp() {
		territoryId = UUID.randomUUID();
		addressId = UUID.randomUUID();
		territory = Territory.builder().id(territoryId).name("Territoire 1").build();
	}

	@Test
	void testSaveAddressNotToDo() {
		AddAddressNotToDoDto dto = new AddAddressNotToDoDto();
		dto.setStreet("Rue Principale");
		dto.setNumber("12");
		dto.setCity("Rennes");
		dto.setZipCode("35000");

		when(territoryService.getTerritory(territoryId)).thenReturn(territory);
		when(addressNotToDoRepository.save(any(AddressNotToDo.class))).thenAnswer(inv -> inv.getArgument(0));

		AddressNotToDo saved = addressNotToDoService.saveAddressNotToDo(territoryId, dto);

		assertNotNull(saved);
		assertEquals("Rue Principale", saved.getStreet());
		assertEquals(territory, saved.getTerritory());
		assertNotNull(saved.getDate());
		verify(addressNotToDoRepository).save(any(AddressNotToDo.class));
	}

	@Test
	void testUpdateAddressNotToDo() {
		AddressNotToDo existing = AddressNotToDo.builder()
				.id(addressId)
				.street("Ancienne Rue")
				.number("1")
				.city("Rennes")
				.zipCode("35000")
				.build();

		when(addressNotToDoRepository.findByIdAndTerritory_Id(addressId, territoryId)).thenReturn(Optional.of(existing));
		when(addressNotToDoRepository.save(any(AddressNotToDo.class))).thenAnswer(inv -> inv.getArgument(0));

		AddAddressNotToDoDto updateDto = new AddAddressNotToDoDto();
		updateDto.setStreet("Nouvelle Rue");
		updateDto.setNumber("2");
		updateDto.setCity("Cesson");
		updateDto.setZipCode("35510");

		AddressNotToDo updated = addressNotToDoService.updateAddressNotToDo(territoryId, addressId, updateDto);

		assertNotNull(updated);
		assertEquals("Nouvelle Rue", updated.getStreet());
		assertEquals("2", updated.getNumber());
		assertEquals("Cesson", updated.getCity());
		assertEquals("35510", updated.getZipCode());
	}

	@Test
	void testGetAddressNotToDo_NotFound_ThrowsException() {
		when(addressNotToDoRepository.findByIdAndTerritory_Id(addressId, territoryId)).thenReturn(Optional.empty());

		assertThrows(RuntimeException.class, () ->
				addressNotToDoService.getAddressNotToDo(territoryId, addressId));
	}

	@Test
	void testDeleteAddressNotToDo() {
		AddressNotToDo existing = AddressNotToDo.builder().id(addressId).build();
		when(addressNotToDoRepository.findByIdAndTerritory_Id(addressId, territoryId)).thenReturn(Optional.of(existing));

		addressNotToDoService.deleteAddressNotToDo(territoryId, addressId);

		verify(addressNotToDoRepository).delete(existing);
	}
}
