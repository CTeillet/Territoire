package com.teillet.territoire.scheduling;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/** Signal des traitements de nuit au service de surveillance (convention de healthchecks.io). */
class HealthcheckPingTest {
	private HttpServer server;
	private final List<String> paths = new CopyOnWriteArrayList<>();

	@BeforeEach
	void start() throws Exception {
		server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/", exchange -> {
			paths.add(exchange.getRequestURI().getPath());
			exchange.sendResponseHeaders(200, -1);
			exchange.close();
		});
		server.start();
	}

	@AfterEach
	void stop() {
		server.stop(0);
	}

	private String url() {
		return "http://127.0.0.1:" + server.getAddress().getPort() + "/ping/abc";
	}

	@Test
	void successAndFailureUseTheHealthchecksPaths() {
		HealthcheckPing ping = new HealthcheckPing(url() + "/");

		ping.report(true);
		ping.report(false);

		assertThat(paths).containsExactly("/ping/abc", "/ping/abc/fail");
	}

	@Test
	void withoutUrlNothingIsSent() {
		HealthcheckPing ping = new HealthcheckPing("");

		ping.report(false);

		assertThat(ping.isEnabled()).isFalse();
		assertThat(paths).isEmpty();
	}

	@Test
	void anUnreachableServiceIsOnlyLogged() {
		HealthcheckPing ping = new HealthcheckPing("http://127.0.0.1:1/ping");

		assertThatCode(() -> ping.report(true)).doesNotThrowAnyException();
	}
}
