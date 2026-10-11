package com.teillet.territoire.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ClientIpResolverTest {

	@Test
	void usesLastForwardedValueAddedByProxy() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.addHeader("X-Forwarded-For", "6.6.6.6, 203.0.113.7");
		assertEquals("203.0.113.7", ClientIpResolver.resolve(request));
	}

	@Test
	void fallsBackToRealIpThenRemoteAddr() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setRemoteAddr("10.0.0.1");
		assertEquals("10.0.0.1", ClientIpResolver.resolve(request));

		request.addHeader("X-Real-IP", "198.51.100.2");
		assertEquals("198.51.100.2", ClientIpResolver.resolve(request));
	}
}
