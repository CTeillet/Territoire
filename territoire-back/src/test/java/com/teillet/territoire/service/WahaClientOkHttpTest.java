package com.teillet.territoire.service;

import com.teillet.territoire.service.impl.WahaClientOkHttp;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class WahaClientOkHttpTest {

	private MockWebServer mockWebServer;
	private WahaClientOkHttp wahaClient;

	@BeforeEach
	void setUp() throws IOException {
		mockWebServer = new MockWebServer();
		mockWebServer.start();
		String baseUrl = mockWebServer.url("/").toString();
		wahaClient = new WahaClientOkHttp(baseUrl, "test-api-key", "test-session");
	}

	@AfterEach
	void tearDown() throws IOException {
		mockWebServer.shutdown();
	}

	@Test
	void testSendMessage_Success() throws InterruptedException {
		mockWebServer.enqueue(new MockResponse().setResponseCode(200).setBody("{\"status\":\"success\"}"));

		wahaClient.sendMessage("+33612345678", "Bonjour test");

		RecordedRequest request = mockWebServer.takeRequest();
		assertEquals("/api/sendText", request.getPath());
		assertEquals("POST", request.getMethod());
		assertEquals("test-api-key", request.getHeader("X-Api-Key"));
		assertTrue(request.getBody().readUtf8().contains("33612345678@c.us"));
	}

	@Test
	void testSendMessage_ServerError_ThrowsException() {
		mockWebServer.enqueue(new MockResponse().setResponseCode(500).setBody("Server Error"));

		assertThrows(RuntimeException.class, () ->
				wahaClient.sendMessage("+33612345678", "Bonjour test"));
	}

	@Test
	void testSendMessage_Error_MessageContainsStatusAndBody() {
		mockWebServer.enqueue(new MockResponse().setResponseCode(422)
				.setBody("{\"message\":\"Session status is not as expected\"}"));

		RuntimeException e = assertThrows(RuntimeException.class, () ->
				wahaClient.sendMessage("+33612345678", "Bonjour test"));

		String cause = e.getCause().getMessage();
		assertTrue(cause.startsWith("WAHA error: 422"), cause);
		assertTrue(cause.endsWith(" - {\"message\":\"Session status is not as expected\"}"), cause);
	}
}
