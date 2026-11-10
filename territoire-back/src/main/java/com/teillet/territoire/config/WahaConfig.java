package com.teillet.territoire.config;

import com.teillet.territoire.service.impl.MonitoredWahaClient;
import com.teillet.territoire.service.IWhatsAppMonitor;
import com.teillet.territoire.service.IWahaClient;
import com.teillet.territoire.service.impl.WahaClientOkHttp;
import io.micrometer.observation.ObservationRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WahaConfig {

	@Bean
	public IWahaClient wahaClient(
			@Value("${waha.base-url}") String baseUrl,
			@Value("${waha.apiKey:}") String apiKey,
			@Value("${waha.session}") String session,
			ObservationRegistry observationRegistry,
			IWhatsAppMonitor monitor
	) {
		// Chaque envoi est suivi : l'application signale une session WAHA déconnectée (cf. WhatsAppMonitor)
		return new MonitoredWahaClient(new WahaClientOkHttp(baseUrl, apiKey, session, observationRegistry), monitor);
	}
}