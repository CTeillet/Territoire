package com.teillet.territoire.service;

import com.teillet.territoire.dto.LateReportSendResultDto;
import com.teillet.territoire.dto.LateReportSettingsDto;
import com.teillet.territoire.dto.LateTerritoryDto;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.impl.LateTerritoryReportService;
import jakarta.mail.Message;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static com.teillet.territoire.utils.MailTestUtils.newMessage;
import static com.teillet.territoire.utils.MailTestUtils.part;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LateTerritoryReportServiceTest {
	/** Lundi 26 octobre 2026, 8 h à Paris. */
	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-26T07:00:00Z"), ZoneId.of("Europe/Paris"));
	private static final List<String> RECIPIENTS = List.of("a@b.fr", "c@d.fr");

	@Mock
	private TerritoryRepository territoryRepository;

	@Mock
	private ISettingService settingService;

	@Mock
	private JavaMailSender mailSender;

	@Mock
	private ObjectProvider<JavaMailSender> mailSenderProvider;

	private LateTerritoryReportService service(JavaMailSender sender, String host) {
		return service(sender, host, "tms@exemple.fr");
	}

	private LateTerritoryReportService service(JavaMailSender sender, String host, String from) {
		when(mailSenderProvider.getIfAvailable()).thenReturn(sender);
		return new LateTerritoryReportService(territoryRepository, settingService, mailSenderProvider,
				host, from, "compte@exemple.fr", "http://localhost:40000/", CLOCK);
	}

	private LateTerritoryReportService configuredService() {
		return service(mailSender, "smtp.exemple.fr");
	}

	private MimeMessage sentMessage() {
		ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
		verify(mailSender).send(captor.capture());
		return captor.getValue();
	}

	@Test
	void sendsTheLateTerritoriesToEveryRecipient() throws Exception {
		LateTerritoryReportService service = configuredService();
		when(settingService.getLateReportRecipients()).thenReturn(RECIPIENTS);
		when(territoryRepository.findLate()).thenReturn(List.of(
				new LateTerritoryDto(UUID.randomUUID(), "T12 <Nord>", "Rennes", "Alice", "Martin",
						LocalDate.of(2026, 9, 26), LocalDate.of(2026, 10, 10)),
				new LateTerritoryDto(UUID.randomUUID(), "T7", "Cesson", "Bruno", null,
						LocalDate.of(2026, 10, 25), null),
				new LateTerritoryDto(UUID.randomUUID(), "T3", null, null, null, null, null)));
		when(mailSender.createMimeMessage()).thenReturn(newMessage());

		LateReportSendResultDto result = service.sendReport();

		assertThat(result.lateTerritories()).isEqualTo(3);
		assertThat(result.recipients()).isEqualTo(RECIPIENTS);

		MimeMessage message = sentMessage();
		assertThat(message.getSubject()).isEqualTo("3 territoires en retard au 26/10/2026");
		assertThat(Arrays.stream(message.getRecipients(Message.RecipientType.TO)).map(Object::toString))
				.containsExactly("a@b.fr", "c@d.fr");
		InternetAddress from = (InternetAddress) message.getFrom()[0];
		assertThat(from.getAddress()).isEqualTo("tms@exemple.fr");
		assertThat(from.getPersonal()).isEqualTo("Territoire");

		String html = part(message, "text/html");
		assertThat(html)
				.contains("3 territoires sont en retard au lundi 26 octobre 2026.")
				.contains("<td style=\"font-weight:bold\">T12 &lt;Nord&gt;</td><td>Rennes</td><td>Alice Martin</td>"
						+ "<td>26/09/2026</td><td>30 jours</td><td>10/10/2026</td>")
				.contains("<td>Bruno</td><td>25/10/2026</td><td>1 jour</td><td>Aucune</td>")
				.contains("<td style=\"font-weight:bold\">T3</td><td>—</td><td>—</td><td>—</td><td>—</td><td>Aucune</td>")
				.contains("<a href=\"http://localhost:40000/territoires/retards\">")
				.doesNotContain("<Nord>");

		assertThat(part(message, "text/plain"))
				.contains("- T12 <Nord> (Rennes) : Alice Martin, échéance 26/09/2026, retard 30 jours, dernière relance 10/10/2026\n")
				.contains("- T7 (Cesson) : Bruno, échéance 25/10/2026, retard 1 jour, dernière relance aucune\n")
				.contains("- T3 : —, échéance —, retard —, dernière relance aucune\n")
				.contains("Voir les territoires en retard : http://localhost:40000/territoires/retards");
	}

	@Test
	void sendsFromTheSmtpAccountByDefault() throws Exception {
		LateTerritoryReportService service = service(mailSender, "smtp.exemple.fr", "");
		when(settingService.getLateReportRecipients()).thenReturn(List.of("a@b.fr"));
		when(territoryRepository.findLate()).thenReturn(List.of());
		when(mailSender.createMimeMessage()).thenReturn(newMessage());

		service.sendReport();

		assertThat(((InternetAddress) sentMessage().getFrom()[0]).getAddress()).isEqualTo("compte@exemple.fr");
	}

	@Test
	void saysSoWhenNoTerritoryIsLate() throws Exception {
		LateTerritoryReportService service = configuredService();
		when(settingService.getLateReportRecipients()).thenReturn(List.of("a@b.fr"));
		when(territoryRepository.findLate()).thenReturn(List.of());
		when(mailSender.createMimeMessage()).thenReturn(newMessage());

		assertThat(service.sendReport().lateTerritories()).isZero();

		MimeMessage message = sentMessage();
		assertThat(message.getSubject()).isEqualTo("Aucun territoire en retard au 26/10/2026");
		assertThat(part(message, "text/html"))
				.contains("Aucun territoire n&#39;est en retard au lundi 26 octobre 2026.")
				.doesNotContain("<table");
	}

	@Test
	void refusesToSendWithoutMailServer() {
		LateTerritoryReportService service = service(null, "smtp.exemple.fr");

		assertThat(service.isMailConfigured()).isFalse();
		assertThatThrownBy(service::sendReport)
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("Aucun serveur d'envoi");
		verifyNoInteractions(territoryRepository);
	}

	@Test
	void anEmptyHostMeansNoMailServer() {
		// MAIL_HOST non renseigné : Spring crée quand même le JavaMailSender
		assertThat(service(mailSender, "").isMailConfigured()).isFalse();
	}

	@Test
	void refusesToSendWithoutRecipients() {
		LateTerritoryReportService service = configuredService();
		when(settingService.getLateReportRecipients()).thenReturn(List.of());

		assertThatThrownBy(service::sendReport)
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("Aucun destinataire");
		verifyNoInteractions(territoryRepository, mailSender);
	}

	@Test
	void reportsTheMailServerError() {
		LateTerritoryReportService service = configuredService();
		when(settingService.getLateReportRecipients()).thenReturn(List.of("a@b.fr"));
		when(territoryRepository.findLate()).thenReturn(List.of());
		when(mailSender.createMimeMessage()).thenReturn(newMessage());
		doThrow(new MailSendException("Authentication failed")).when(mailSender).send(any(MimeMessage.class));

		assertThatThrownBy(service::sendReport)
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("Échec de l'envoi de l'e-mail : Authentication failed");
	}

	@Test
	void weeklyReportIsSkippedUntilConfigured() {
		service(null, "").sendWeeklyReport();

		LateTerritoryReportService withoutRecipients = configuredService();
		when(settingService.getLateReportRecipients()).thenReturn(List.of());
		withoutRecipients.sendWeeklyReport();

		verifyNoInteractions(territoryRepository, mailSender);
	}

	@Test
	void weeklyReportIsSentOnceConfigured() {
		LateTerritoryReportService service = configuredService();
		when(settingService.getLateReportRecipients()).thenReturn(List.of("a@b.fr"));
		when(territoryRepository.findLate()).thenReturn(List.of());
		when(mailSender.createMimeMessage()).thenReturn(newMessage());

		service.sendWeeklyReport();

		verify(mailSender).send(any(MimeMessage.class));
	}

	@Test
	void settingsCombineRecipientsAndMailServerState() {
		LateTerritoryReportService service = configuredService();
		when(settingService.getLateReportRecipients()).thenReturn(List.of("a@b.fr"));

		LateReportSettingsDto settings = service.updateSettings(
				LateReportSettingsDto.builder().recipients(List.of("a@b.fr")).mailConfigured(false).build());

		verify(settingService).updateLateReportRecipients(List.of("a@b.fr"));
		assertThat(settings.getRecipients()).containsExactly("a@b.fr");
		assertThat(settings.isMailConfigured()).isTrue();
	}
}
