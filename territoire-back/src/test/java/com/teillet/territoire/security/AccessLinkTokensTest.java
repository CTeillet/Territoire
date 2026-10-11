package com.teillet.territoire.security;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class AccessLinkTokensTest {
	private static final String JWT_SECRET = "dGVzdF9zZWNyZXRfa2V5X2Zvcl9qd3RfYXV0aGVudGljYXRpb25fdGVzdHNfc3ByaW5nX2Jvb3RfMTIzNDU2Nzg5MA==";

	private final AccessLinkTokens tokens = new AccessLinkTokens("secret-dedie-aux-liens", JWT_SECRET);

	@Test
	void generatedToken_IsParsedBack() {
		UUID personId = UUID.randomUUID();
		String token = tokens.generate(personId, 3);

		AccessLinkTokens.ParsedToken parsed = tokens.parse(token).orElseThrow();
		assertEquals(personId, parsed.personId());
		assertEquals(3, parsed.version());
	}

	@Test
	void sameInputs_GiveSameToken() {
		UUID personId = UUID.randomUUID();
		assertEquals(tokens.generate(personId, 1), tokens.generate(personId, 1));
		assertNotEquals(tokens.generate(personId, 1), tokens.generate(personId, 2));
	}

	@Test
	void forgedVersion_IsRejected() {
		UUID personId = UUID.randomUUID();
		String[] parts = tokens.generate(personId, 1).split("\\.");
		String forged = parts[0] + ".2." + parts[2];

		assertTrue(tokens.parse(forged).isEmpty());
	}

	@Test
	void tokenFromAnotherSecret_IsRejected() {
		AccessLinkTokens other = new AccessLinkTokens("un-autre-secret", JWT_SECRET);
		String token = other.generate(UUID.randomUUID(), 1);

		assertTrue(tokens.parse(token).isEmpty());
	}

	@Test
	void malformedTokens_AreRejected() {
		assertTrue(tokens.parse(null).isEmpty());
		assertTrue(tokens.parse("").isEmpty());
		assertTrue(tokens.parse("abc").isEmpty());
		assertTrue(tokens.parse("a.b.c").isEmpty());
		assertTrue(tokens.parse("x".repeat(500)).isEmpty());
	}

	@Test
	void withoutDedicatedSecret_KeyIsDerivedFromJwtSecret() {
		AccessLinkTokens derived = new AccessLinkTokens("", JWT_SECRET);
		UUID personId = UUID.randomUUID();

		assertTrue(derived.parse(derived.generate(personId, 1)).isPresent());
		assertTrue(tokens.parse(derived.generate(personId, 1)).isEmpty());
	}

	@Test
	void identifierOfWrongLength_IsRejected() {
		UUID personId = UUID.randomUUID();
		String[] parts = tokens.generate(personId, 1).split("\\.");

		assertTrue(tokens.parse("AAAA." + parts[1] + "." + parts[2]).isEmpty());
	}
}
