package com.teillet.territoire.service.impl;

import com.teillet.territoire.service.IWahaClient;
import com.teillet.territoire.service.IWhatsAppMonitor;
import lombok.extern.slf4j.Slf4j;

/**
 * Client WAHA dont chaque envoi est suivi (cf. WhatsAppMonitor) : tous les messages de l'application passent par lui
 * (attribution, lien personnel, rappels, demandes, test). L'échec est ensuite relancé à l'appelant, comme avant.
 */
@Slf4j
public class MonitoredWahaClient implements IWahaClient {
	private final IWahaClient delegate;
	private final IWhatsAppMonitor monitor;

	public MonitoredWahaClient(IWahaClient delegate, IWhatsAppMonitor monitor) {
		this.delegate = delegate;
		this.monitor = monitor;
	}

	@Override
	public void sendMessage(String phone, String message) {
		try {
			delegate.sendMessage(phone, message);
		} catch (RuntimeException e) {
			record(() -> monitor.recordFailure(reasonOf(e)));
			throw e;
		}
		record(monitor::recordSuccess);
	}

	/** Le suivi ne doit jamais faire échouer l'envoi lui-même (base indisponible, e-mail refusé...). */
	private static void record(Runnable action) {
		try {
			action.run();
		} catch (RuntimeException e) {
			log.warn("Suivi de l'envoi WhatsApp impossible : {}", e.getMessage());
		}
	}

	/** Motif le plus précis : celui de WAHA (code HTTP, corps de la réponse), souvent dans la cause. */
	static String reasonOf(Throwable e) {
		Throwable deepest = e;
		while (deepest.getCause() != null && deepest.getCause() != deepest) {
			deepest = deepest.getCause();
		}
		String message = deepest.getMessage();
		return message == null || message.isBlank() ? e.getClass().getSimpleName() : message;
	}
}
