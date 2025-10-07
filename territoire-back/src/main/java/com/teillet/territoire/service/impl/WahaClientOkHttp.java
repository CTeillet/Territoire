package com.teillet.territoire.service.impl;

import com.teillet.territoire.service.IWahaClient;
import okhttp3.*;

import java.io.IOException;
import java.time.Duration;

public class WahaClientOkHttp implements IWahaClient {
	public static final int CONNECTION_TIMEOUT = 5;
	public static final int READ_TIMEOUT = 10;
	private final OkHttpClient http;
	private final String baseUrl;
	private final String apiKey;
	private final String defaultSession;

	public WahaClientOkHttp(String baseUrl, String apiKey, String defaultSession) {
		this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
		this.apiKey = apiKey;
		this.defaultSession = (defaultSession == null || defaultSession.isBlank()) ? "default" : defaultSession;

		this.http = new OkHttpClient.Builder()
				.connectTimeout(Duration.ofSeconds(CONNECTION_TIMEOUT))
				.readTimeout(Duration.ofSeconds(READ_TIMEOUT))
				.build();
	}

	@Override
	public void sendMessage(String phone, String message) {
		String chatId = phone.replace("+", "") + "@c.us";
		String json = """
            {
              "session": "%s",
              "chatId": "%s",
              "text": "%s"
            }
            """.formatted(defaultSession, chatId, message.replace("\"", "\\\""));

		RequestBody body = RequestBody.create(json, MediaType.parse("application/json"));
		Request.Builder builder = new Request.Builder()
				.url(baseUrl + "/api/sendText")
				.post(body)
				.header("Content-Type", "application/json");

		if (apiKey != null && !apiKey.isBlank()) {
			builder.header("X-Api-Key", apiKey);
		}

		try (Response response = http.newCall(builder.build()).execute()) {
			if (!response.isSuccessful()) {
				throw new IOException("WAHA error: " + response.code() + " - " + response.message());
			}
		} catch (IOException e) {
			throw new RuntimeException("Erreur lors de l'envoi du message à WAHA", e);
		}
	}
}
