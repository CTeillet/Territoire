package com.teillet.territoire.config;

import io.micrometer.observation.ObservationPredicate;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.observation.ServerRequestObservationContext;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
@RequiredArgsConstructor
public class ObservabilityConfig implements InitializingBean {
	private final OpenTelemetry openTelemetry;

	/**
	 * Branche l'appender Logback « OTEL » (déclaré dans logback-spring.xml) sur le SDK OpenTelemetry de Spring Boot :
	 * Spring Boot configure l'export OTLP des logs mais n'installe pas l'appender lui-même.
	 */
	@Override
	public void afterPropertiesSet() {
		OpenTelemetryAppender.install(openTelemetry);
	}

	/**
	 * Pas de traces ni de métriques pour /actuator (healthcheck Docker toutes les 30 s), y compris les observations
	 * Spring Security et SQL faites pendant ces requêtes, qui deviendraient sinon des spans orphelins.
	 */
	@Bean
	public ObservationPredicate ignoreActuatorRequests() {
		return (name, context) -> {
			if (context instanceof ServerRequestObservationContext serverContext) {
				return !isActuator(serverContext.getCarrier().getRequestURI());
			}
			return !(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
					&& isActuator(attributes.getRequest().getRequestURI()));
		};
	}

	private static boolean isActuator(String uri) {
		return uri != null && uri.startsWith("/actuator");
	}
}
