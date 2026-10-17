package com.teillet.territoire.service;

import com.teillet.territoire.dto.WhatsAppTestResultDto;

import java.util.UUID;

public interface IWhatsAppTestService {
	WhatsAppTestResultDto sendTestMessage(UUID personId, String message);
}
