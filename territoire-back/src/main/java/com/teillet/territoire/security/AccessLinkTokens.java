package com.teillet.territoire.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Jetons des liens personnels : {@code <personId>.<version>.<signature>}.
 * <p>
 * La signature est un HMAC-SHA256 (tronqué à 128 bits) de l'identifiant et de la version : le jeton n'a pas besoin
 * d'être stocké, un lien peut être renvoyé à l'identique, et incrémenter la version invalide l'ancien lien.
 * <p>
 * Le secret vient de {@code access-link.secret} ; à défaut il est dérivé de {@code jwt.secret}
 * (changer la clé JWT invaliderait alors aussi tous les liens).
 */
@Slf4j
@Component
public class AccessLinkTokens {
	private static final String ALGORITHM = "HmacSHA256";
	private static final int SIGNATURE_BYTES = 16;
	private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
	private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

	private final byte[] key;

	public AccessLinkTokens(@Value("${access-link.secret:}") String accessLinkSecret,
	                        @Value("${jwt.secret}") String jwtSecret) {
		if (accessLinkSecret != null && !accessLinkSecret.isBlank()) {
			this.key = accessLinkSecret.getBytes(StandardCharsets.UTF_8);
		} else {
			log.warn("access-link.secret absent : clé des liens personnels dérivée de jwt.secret");
			this.key = hmac(Base64.getDecoder().decode(jwtSecret), "territoire-access-link".getBytes(StandardCharsets.UTF_8));
		}
	}

	public record ParsedToken(UUID personId, int version) {
	}

	public String generate(UUID personId, int version) {
		return ENCODER.encodeToString(toBytes(personId)) + "." + version + "." + ENCODER.encodeToString(signature(personId, version));
	}

	/**
	 * @return l'identifiant et la version si la signature est valide (sans vérifier l'état de l'accès en base)
	 */
	public Optional<ParsedToken> parse(String token) {
		if (token == null || token.length() > 100) {
			return Optional.empty();
		}
		String[] parts = token.split("\\.");
		if (parts.length != 3) {
			return Optional.empty();
		}
		try {
			byte[] idBytes = DECODER.decode(parts[0]);
			if (idBytes.length != 16) {
				return Optional.empty();
			}
			UUID personId = fromBytes(idBytes);
			int version = Integer.parseInt(parts[1]);
			byte[] given = DECODER.decode(parts[2]);
			if (!MessageDigest.isEqual(given, signature(personId, version))) {
				return Optional.empty();
			}
			return Optional.of(new ParsedToken(personId, version));
		} catch (IllegalArgumentException e) {
			return Optional.empty();
		}
	}

	private byte[] signature(UUID personId, int version) {
		byte[] payload = (personId + ":" + version).getBytes(StandardCharsets.UTF_8);
		return Arrays.copyOf(hmac(key, payload), SIGNATURE_BYTES);
	}

	private static byte[] hmac(byte[] key, byte[] payload) {
		try {
			Mac mac = Mac.getInstance(ALGORITHM);
			mac.init(new SecretKeySpec(key, ALGORITHM));
			return mac.doFinal(payload);
		} catch (GeneralSecurityException e) {
			throw new IllegalStateException("HMAC indisponible", e);
		}
	}

	private static byte[] toBytes(UUID id) {
		return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
	}

	private static UUID fromBytes(byte[] bytes) {
		ByteBuffer buffer = ByteBuffer.wrap(bytes);
		return new UUID(buffer.getLong(), buffer.getLong());
	}
}
