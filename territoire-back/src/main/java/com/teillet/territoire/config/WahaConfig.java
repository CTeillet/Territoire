package com.teillet.territoire.config;

import com.teillet.territoire.service.IWahaClient;
import com.teillet.territoire.service.impl.WahaClientOkHttp;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WahaConfig {

	@Bean
	public IWahaClient wahaClient(
			@Value("${waha.base-url}") String baseUrl,
			@Value("${waha.api-key:}") String apiKey,
			@Value("${waha.session:default}") String session
	) {
		return new WahaClientOkHttp(baseUrl, apiKey, session);
	}
}