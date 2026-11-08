package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.WhatsAppStatusDto;
import com.teillet.territoire.model.Setting;
import com.teillet.territoire.repository.SettingRepository;
import com.teillet.territoire.service.ILateTerritoryReportService;
import com.teillet.territoire.service.IWhatsAppMonitor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Suivi des envois WhatsApp (cf. MonitoredWahaClient) : le dernier succès et le dernier échec sont gardés dans les
 * réglages. Quand les envois cessent, puis quand ils reprennent, les destinataires du récapitulatif des retards
 * reçoivent un e-mail (un seul par changement d'état, pas un par message).
 * <p>
 * Chaque enregistrement a sa propre transaction : un envoi qui échoue annule souvent la transaction de l'appelant
 * (rappel de retard), l'échec doit rester enregistré.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppMonitor implements IWhatsAppMonitor {
	/** Motif gardé : assez pour reconnaître la cause (session non connectée, clé refusée...). */
	static final int MAX_REASON_LENGTH = 500;
	private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm", Locale.FRENCH)
			.withZone(ZoneId.of("Europe/Paris"));

	private final SettingRepository settingRepository;
	private final ILateTerritoryReportService mailService;
	private final Clock clock;

	@Override
	@Transactional(readOnly = true)
	public WhatsAppStatusDto getStatus() {
		return settingRepository.findAll().stream().findFirst()
				.map(s -> WhatsAppStatusDto.of(s.getWhatsappLastSuccessAt(), s.getWhatsappLastFailureAt(),
						s.getWhatsappLastFailure()))
				.orElse(WhatsAppStatusDto.of(null, null, null));
	}

	@Override
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void recordSuccess() {
		boolean wasFailing = getStatus().failing();
		ensureSettingRow();
		settingRepository.recordWhatsAppSuccess(clock.instant());
		if (wasFailing) {
			log.info("Envois WhatsApp rétablis");
			mailService.notifyRecipients("Les messages WhatsApp partent de nouveau",
					"Les messages WhatsApp de Territoire partent de nouveau (" + DATE_TIME.format(clock.instant()) + ").");
		}
	}

	@Override
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void recordFailure(String reason) {
		boolean wasFailing = getStatus().failing();
		String shortReason = shorten(reason);
		ensureSettingRow();
		settingRepository.recordWhatsAppFailure(clock.instant(), shortReason);
		if (!wasFailing) {
			log.warn("Envois WhatsApp en échec : {}", shortReason);
			mailService.notifyRecipients("Les messages WhatsApp ne partent plus", """
					Un message WhatsApp de Territoire n'a pas pu être envoyé (%s) :
					%s

					Les messages d'attribution, les liens personnels et les rappels ne partent plus tant que la session \
					WAHA n'est pas reconnectée. Une fois reconnectée, Paramètres > Données > Outils avancés > Test WhatsApp le vérifie.
					Un e-mail vous préviendra quand les envois reprendront."""
					.formatted(DATE_TIME.format(clock.instant()), shortReason));
		}
	}

	static String shorten(String reason) {
		if (reason == null) {
			return "";
		}
		return reason.length() > MAX_REASON_LENGTH ? reason.substring(0, MAX_REASON_LENGTH) + "…" : reason;
	}

	/** La ligne des réglages existe (créée au premier réglage enregistré) : sinon la mise à jour ne toucherait rien. */
	private void ensureSettingRow() {
		if (settingRepository.count() == 0) {
			settingRepository.save(Setting.builder().publishersCount(0).build());
		}
	}
}
