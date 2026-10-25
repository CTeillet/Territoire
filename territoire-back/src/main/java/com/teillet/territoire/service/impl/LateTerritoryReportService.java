package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.LateReportSendResultDto;
import com.teillet.territoire.dto.LateReportSettingsDto;
import com.teillet.territoire.dto.LateTerritoryDto;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.ILateTerritoryReportService;
import com.teillet.territoire.service.ISettingService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.springframework.web.util.HtmlUtils.htmlEscape;

/**
 * Pas de {@code @Transactional} : une seule requête (projection) suffit, et la connexion à la base n'a pas à rester
 * ouverte pendant l'échange avec le serveur SMTP.
 */
@Slf4j
@Service
public class LateTerritoryReportService implements ILateTerritoryReportService {
	private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
	private static final DateTimeFormatter LONG_DATE = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", Locale.FRENCH);
	private static final String NONE = "—";

	private final TerritoryRepository territoryRepository;
	private final ISettingService settingService;
	/** Null tant qu'aucun serveur SMTP n'est configuré (spring.mail.host). */
	private final JavaMailSender mailSender;
	private final String mailHost;
	private final String from;
	private final String appUrl;
	private final Clock clock;

	public LateTerritoryReportService(TerritoryRepository territoryRepository,
	                                  ISettingService settingService,
	                                  ObjectProvider<JavaMailSender> mailSender,
	                                  @Value("${spring.mail.host:}") String mailHost,
	                                  @Value("${territoire.mail.from:}") String from,
	                                  @Value("${spring.mail.username:}") String mailUsername,
	                                  @Value("${territoire.app-url:}") String appUrl,
	                                  Clock clock) {
		this.territoryRepository = territoryRepository;
		this.settingService = settingService;
		this.mailSender = mailSender.getIfAvailable();
		this.mailHost = mailHost;
		// Par défaut, le compte SMTP (MAIL_FROM vide dans docker-compose)
		this.from = StringUtils.hasText(from) ? from : mailUsername;
		this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
		this.clock = clock;
	}

	@Override
	public boolean isMailConfigured() {
		// Spring crée le JavaMailSender dès que spring.mail.host existe, même vide (MAIL_HOST non renseigné)
		return mailSender != null && StringUtils.hasText(mailHost);
	}

	@Override
	public LateReportSettingsDto getSettings() {
		return LateReportSettingsDto.builder()
				.recipients(settingService.getLateReportRecipients())
				.mailConfigured(isMailConfigured())
				.build();
	}

	@Override
	public LateReportSettingsDto updateSettings(LateReportSettingsDto settings) {
		settingService.updateLateReportRecipients(settings.getRecipients());
		return getSettings();
	}

	@Override
	public LateReportSendResultDto sendReport() {
		if (!isMailConfigured()) {
			throw new IllegalStateException("Aucun serveur d'envoi d'e-mails n'est configuré (variables MAIL_* du serveur)");
		}
		List<String> recipients = settingService.getLateReportRecipients();
		if (recipients.isEmpty()) {
			throw new IllegalStateException("Aucun destinataire n'est enregistré pour le récapitulatif des retards");
		}

		List<LateTerritoryDto> lateTerritories = territoryRepository.findLate();
		LocalDate today = LocalDate.now(clock);
		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
			if (StringUtils.hasText(from)) {
				helper.setFrom(from, "Territoire");
			}
			helper.setTo(recipients.toArray(String[]::new));
			helper.setSubject(subject(lateTerritories.size(), today));
			helper.setText(renderText(lateTerritories, today), renderHtml(lateTerritories, today));
			mailSender.send(message);
		} catch (MessagingException | UnsupportedEncodingException | MailException e) {
			log.error("Échec de l'envoi du récapitulatif des retards à {}", recipients, e);
			throw new IllegalStateException("Échec de l'envoi de l'e-mail : " + e.getMessage(), e);
		}
		log.info("Récapitulatif des retards envoyé à {} destinataire(s) : {} territoire(s) en retard",
				recipients.size(), lateTerritories.size());
		return new LateReportSendResultDto(lateTerritories.size(), recipients);
	}

	@Override
	public void sendWeeklyReport() {
		if (!isMailConfigured()) {
			log.info("Récapitulatif des retards non envoyé : aucun serveur SMTP configuré");
			return;
		}
		if (settingService.getLateReportRecipients().isEmpty()) {
			log.info("Récapitulatif des retards non envoyé : aucun destinataire enregistré");
			return;
		}
		sendReport();
	}

	// ---------------------------------------------------------------- Contenu de l'e-mail

	private static String subject(int count, LocalDate today) {
		String date = DATE.format(today);
		return switch (count) {
			case 0 -> "Aucun territoire en retard au " + date;
			case 1 -> "1 territoire en retard au " + date;
			default -> count + " territoires en retard au " + date;
		};
	}

	private static String summary(int count, LocalDate today) {
		String date = LONG_DATE.format(today);
		return switch (count) {
			case 0 -> "Aucun territoire n'est en retard au " + date + ".";
			case 1 -> "1 territoire est en retard au " + date + ".";
			default -> count + " territoires sont en retard au " + date + ".";
		};
	}

	private String lateListUrl() {
		return appUrl.isEmpty() ? null : appUrl + "/territoires/retards";
	}

	private String renderText(List<LateTerritoryDto> lateTerritories, LocalDate today) {
		StringBuilder text = new StringBuilder("Territoires en retard\n\n")
				.append(summary(lateTerritories.size(), today)).append('\n');
		if (!lateTerritories.isEmpty()) {
			text.append('\n');
		}
		for (LateTerritoryDto t : lateTerritories) {
			text.append("- ").append(t.name());
			if (StringUtils.hasText(t.cityName())) {
				text.append(" (").append(t.cityName()).append(')');
			}
			text.append(" : ").append(person(t))
					.append(", échéance ").append(date(t.dueDate()))
					.append(", retard ").append(delay(t.dueDate(), today))
					.append(", dernière relance ").append(t.lastReminderDate() == null ? "aucune" : date(t.lastReminderDate()))
					.append('\n');
		}
		String url = lateListUrl();
		if (url != null) {
			text.append("\nVoir les territoires en retard : ").append(url).append('\n');
		}
		return text.toString();
	}

	private String renderHtml(List<LateTerritoryDto> lateTerritories, LocalDate today) {
		StringBuilder html = new StringBuilder("""
				<!doctype html>
				<html lang="fr"><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px">
				<h2 style="margin:0 0 12px">Territoires en retard</h2>
				""");
		html.append("<p>").append(escape(summary(lateTerritories.size(), today))).append("</p>\n");
		if (!lateTerritories.isEmpty()) {
			html.append("""
					<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb">
					<thead><tr style="background:#f3f4f6;text-align:left">\
					<th>Territoire</th><th>Ville</th><th>Attribué à</th><th>Échéance</th><th>Retard</th><th>Dernière relance</th>\
					</tr></thead>
					<tbody>
					""");
			for (LateTerritoryDto t : lateTerritories) {
				html.append("<tr style=\"border-top:1px solid #e5e7eb\">")
						.append(cell(t.name(), true))
						.append(cell(StringUtils.hasText(t.cityName()) ? t.cityName() : NONE, false))
						.append(cell(person(t), false))
						.append(cell(date(t.dueDate()), false))
						.append(cell(delay(t.dueDate(), today), false))
						.append(cell(t.lastReminderDate() == null ? "Aucune" : date(t.lastReminderDate()), false))
						.append("</tr>\n");
			}
			html.append("</tbody>\n</table>\n");
		}
		String url = lateListUrl();
		if (url != null) {
			html.append("<p style=\"margin-top:16px\"><a href=\"").append(escape(url))
					.append("\">Voir les territoires en retard dans Territoire</a></p>\n");
		}
		return html.append("</body></html>\n").toString();
	}

	private static String cell(String value, boolean bold) {
		return (bold ? "<td style=\"font-weight:bold\">" : "<td>") + escape(value) + "</td>";
	}

	/** Échappe seulement &lt;, &gt;, &amp; et les guillemets : les accents restent lisibles (e-mail en UTF-8). */
	private static String escape(String value) {
		return htmlEscape(value, StandardCharsets.UTF_8.name());
	}

	private static String person(LateTerritoryDto t) {
		String name = Stream.of(t.firstName(), t.lastName())
				.filter(StringUtils::hasText)
				.collect(Collectors.joining(" "));
		return name.isEmpty() ? NONE : name;
	}

	private static String date(LocalDate date) {
		return date == null ? NONE : DATE.format(date);
	}

	private static String delay(LocalDate dueDate, LocalDate today) {
		if (dueDate == null) {
			return NONE;
		}
		long days = ChronoUnit.DAYS.between(dueDate, today);
		if (days <= 0) {
			return NONE;
		}
		return days == 1 ? "1 jour" : days + " jours";
	}
}
