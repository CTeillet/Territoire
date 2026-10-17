package com.teillet.territoire.service;

import com.teillet.territoire.dto.WhatsAppTestResultDto;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.service.impl.WhatsAppTestService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhatsAppTestServiceTest {

	@Mock
	private IPersonService personService;

	@Mock
	private IWahaClient wahaClient;

	@InjectMocks
	private WhatsAppTestService whatsAppTestService;

	private final UUID personId = UUID.randomUUID();

	private void givenPerson(String phoneNumber) {
		when(personService.getPerson(personId)).thenReturn(Person.builder()
				.id(personId)
				.firstName("Alice")
				.lastName("Martin")
				.phoneNumber(phoneNumber)
				.build());
	}

	@Test
	void sendTestMessage_envoieLeMessageAuNumeroDeLaPersonne() {
		givenPerson("+33612345678");

		WhatsAppTestResultDto result = whatsAppTestService.sendTestMessage(personId, "Test");

		verify(wahaClient).sendMessage("+33612345678", "Test");
		assertTrue(result.isSent());
		assertEquals("Alice Martin", result.getRecipient());
		assertEquals("+33612345678", result.getPhoneNumber());
		assertNull(result.getError());
	}

	@Test
	void sendTestMessage_renvoieLaCausePremiereSiWahaRefuse() {
		givenPerson("+33612345678");
		doThrow(new RuntimeException("Erreur lors de l'envoi du message à WAHA",
				new IOException("WAHA error: 401 - {\"message\":\"Unauthorized\"}")))
				.when(wahaClient).sendMessage(anyString(), anyString());

		WhatsAppTestResultDto result = whatsAppTestService.sendTestMessage(personId, "Test");

		assertFalse(result.isSent());
		assertEquals("Alice Martin", result.getRecipient());
		assertEquals("IOException : WAHA error: 401 - {\"message\":\"Unauthorized\"}", result.getError());
	}

	@Test
	void sendTestMessage_refuseUnePersonneSansNumero() {
		givenPerson(" ");

		IllegalStateException e = assertThrows(IllegalStateException.class,
				() -> whatsAppTestService.sendTestMessage(personId, "Test"));

		assertEquals("Aucun numéro de téléphone pour cette personne", e.getMessage());
		verifyNoInteractions(wahaClient);
	}
}
