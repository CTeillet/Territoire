package com.teillet.territoire.service;

import com.teillet.territoire.dto.WhatsAppStatusDto;
import com.teillet.territoire.model.Setting;
import com.teillet.territoire.repository.SettingRepository;
import com.teillet.territoire.service.impl.WhatsAppMonitor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Suivi des envois WhatsApp : état, et un seul e-mail par changement d'état. */
@ExtendWith(MockitoExtension.class)
class WhatsAppMonitorTest {
	private static final Instant NOW = Instant.parse("2026-11-08T10:00:00Z");
	private static final Clock CLOCK = Clock.fixed(NOW, ZoneId.of("Europe/Paris"));

	@Mock
	private SettingRepository settingRepository;

	@Mock
	private ILateTerritoryReportService mailService;

	private WhatsAppMonitor monitor;
	private final Setting setting = Setting.builder().publishersCount(0).build();

	@BeforeEach
	void setUp() {
		monitor = new WhatsAppMonitor(settingRepository, mailService, CLOCK);
		lenient().when(settingRepository.findAll()).thenReturn(List.of(setting));
		lenient().when(settingRepository.count()).thenReturn(1L);
	}

	@Test
	void statusIsFailingWhenTheLastSendFailed() {
		assertThat(monitor.getStatus().failing()).isFalse();

		setting.setWhatsappLastSuccessAt(NOW.minusSeconds(3600));
		setting.setWhatsappLastFailureAt(NOW.minusSeconds(60));
		setting.setWhatsappLastFailure("WAHA error: 422 - session STOPPED");
		WhatsAppStatusDto status = monitor.getStatus();
		assertThat(status.failing()).isTrue();
		assertThat(status.lastFailure()).isEqualTo("WAHA error: 422 - session STOPPED");

		setting.setWhatsappLastSuccessAt(NOW);
		assertThat(monitor.getStatus().failing()).isFalse();
	}

	@Test
	void firstFailureIsRecordedAndMailedOnce() {
		monitor.recordFailure("WAHA error: 401 - invalid api key");

		verify(settingRepository).recordWhatsAppFailure(NOW, "WAHA error: 401 - invalid api key");
		ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
		verify(mailService).notifyRecipients(eq("Les messages WhatsApp ne partent plus"), text.capture());
		assertThat(text.getValue()).contains("WAHA error: 401 - invalid api key").contains("08/11/2026 à 11:00");

		// Déjà en échec : pas de nouvel e-mail
		setting.setWhatsappLastFailureAt(NOW);
		monitor.recordFailure("encore");
		verify(mailService, times(1)).notifyRecipients(anyString(), anyString());
	}

	@Test
	void recoveryIsMailedOnlyAfterAFailure() {
		monitor.recordSuccess();
		verify(settingRepository).recordWhatsAppSuccess(NOW);
		verifyNoInteractions(mailService);

		setting.setWhatsappLastFailureAt(NOW.minusSeconds(60));
		monitor.recordSuccess();
		verify(mailService).notifyRecipients(eq("Les messages WhatsApp partent de nouveau"), anyString());
	}

	@Test
	void longReasonsAreShortenedAndTheSettingRowIsCreated() {
		when(settingRepository.findAll()).thenReturn(List.of());
		when(settingRepository.count()).thenReturn(0L);

		monitor.recordFailure("x".repeat(800));

		verify(settingRepository).save(any(Setting.class));
		ArgumentCaptor<String> reason = ArgumentCaptor.forClass(String.class);
		verify(settingRepository).recordWhatsAppFailure(eq(NOW), reason.capture());
		assertThat(reason.getValue()).hasSize(501).endsWith("…");
	}
}
