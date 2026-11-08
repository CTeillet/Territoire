package com.teillet.territoire.service;

import com.teillet.territoire.dto.WhatsAppStatusDto;

/** Suivi des envois WhatsApp : état affiché dans l'application, alerte par e-mail quand les envois cessent. */
public interface IWhatsAppMonitor {
	WhatsAppStatusDto getStatus();

	void recordSuccess();

	void recordFailure(String reason);
}
