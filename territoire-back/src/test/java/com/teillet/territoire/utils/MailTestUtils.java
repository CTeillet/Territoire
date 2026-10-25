package com.teillet.territoire.utils;

import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import java.util.Properties;

/**
 * Lecture des e-mails construits par l'application (sans serveur SMTP).
 */
public final class MailTestUtils {
	private MailTestUtils() {
	}

	/** Message vide, à renvoyer par un {@code JavaMailSender} simulé. */
	public static MimeMessage newMessage() {
		return new MimeMessage(Session.getInstance(new Properties()));
	}

	/** Contenu de la première partie du type demandé ({@code text/plain}, {@code text/html}), ou null. */
	public static String part(MimeMessage message, String mimeType) throws Exception {
		// Renseigne les en-têtes Content-Type des parties, sur lesquels repose isMimeType
		message.saveChanges();
		return find(message, mimeType);
	}

	private static String find(Part part, String mimeType) throws Exception {
		if (part.isMimeType(mimeType)) {
			return (String) part.getContent();
		}
		if (part.getContent() instanceof Multipart multipart) {
			for (int i = 0; i < multipart.getCount(); i++) {
				String found = find(multipart.getBodyPart(i), mimeType);
				if (found != null) {
					return found;
				}
			}
		}
		return null;
	}
}
