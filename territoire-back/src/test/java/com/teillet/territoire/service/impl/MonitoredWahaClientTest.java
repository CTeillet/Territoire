package com.teillet.territoire.service.impl;

import com.teillet.territoire.service.IWahaClient;
import com.teillet.territoire.service.IWhatsAppMonitor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** Chaque envoi WhatsApp est suivi, sans changer ce que voit l'appelant. */
@ExtendWith(MockitoExtension.class)
class MonitoredWahaClientTest {
	@Mock
	private IWahaClient delegate;

	@Mock
	private IWhatsAppMonitor monitor;

	@Test
	void aSentMessageIsRecordedAsASuccess() {
		new MonitoredWahaClient(delegate, monitor).sendMessage("+33612345678", "Bonjour");

		verify(delegate).sendMessage("+33612345678", "Bonjour");
		verify(monitor).recordSuccess();
		verify(monitor, never()).recordFailure(anyString());
	}

	@Test
	void aFailureIsRecordedWithWahaReasonAndRethrown() {
		RuntimeException failure = new RuntimeException("Erreur lors de l'envoi du message à WAHA",
				new IOException("WAHA error: 422 - session STOPPED"));
		doThrow(failure).when(delegate).sendMessage(anyString(), anyString());

		assertThatThrownBy(() -> new MonitoredWahaClient(delegate, monitor).sendMessage("+336", "x")).isSameAs(failure);

		verify(monitor).recordFailure("WAHA error: 422 - session STOPPED");
		verify(monitor, never()).recordSuccess();
	}

	@Test
	void monitoringProblemsNeverBreakTheSend() {
		doThrow(new IllegalStateException("base indisponible")).when(monitor).recordSuccess();

		new MonitoredWahaClient(delegate, monitor).sendMessage("+336", "x");

		verify(delegate).sendMessage("+336", "x");
	}

	@Test
	void reasonFallsBackToTheExceptionType() {
		assertThat(MonitoredWahaClient.reasonOf(new IllegalStateException())).isEqualTo("IllegalStateException");
		assertThat(MonitoredWahaClient.reasonOf(new RuntimeException("seul motif"))).isEqualTo("seul motif");
	}
}
