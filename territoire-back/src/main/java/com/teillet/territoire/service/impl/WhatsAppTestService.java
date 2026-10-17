package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.WhatsAppTestResultDto;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.service.IPersonService;
import com.teillet.territoire.service.IWahaClient;
import com.teillet.territoire.service.IWhatsAppTestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Envoi d'un message WhatsApp de test pour vérifier la liaison avec WAHA (adresse, session, clé API).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppTestService implements IWhatsAppTestService {
	private final IPersonService personService;
	private final IWahaClient wahaClient;

	@Override
	public WhatsAppTestResultDto sendTestMessage(UUID personId, String message) {
		Person person = personService.getPerson(personId);
		String phoneNumber = person.getPhoneNumber();
		if (phoneNumber == null || phoneNumber.isBlank()) {
			throw new IllegalStateException("Aucun numéro de téléphone pour cette personne");
		}

		WhatsAppTestResultDto.WhatsAppTestResultDtoBuilder result = WhatsAppTestResultDto.builder()
				.recipient(person.getFirstName() + " " + person.getLastName())
				.phoneNumber(phoneNumber);
		try {
			wahaClient.sendMessage(phoneNumber, message);
		} catch (RuntimeException e) {
			log.warn("Échec du message WhatsApp de test à {}", phoneNumber, e);
			return result.sent(false).error(rootCause(e)).build();
		}
		log.info("Message WhatsApp de test envoyé à {}", phoneNumber);
		return result.sent(true).build();
	}

	/**
	 * La cause première (code HTTP renvoyé par WAHA, hôte inconnu, délai dépassé...) est ce qui permet de diagnostiquer :
	 * le message de l'exception englobante est toujours le même.
	 */
	private static String rootCause(Throwable e) {
		Throwable root = e;
		while (root.getCause() != null && root.getCause() != root) {
			root = root.getCause();
		}
		String type = root.getClass().getSimpleName();
		return root.getMessage() == null ? type : type + " : " + root.getMessage();
	}
}
