package com.teillet.territoire.security;

import com.teillet.territoire.config.ApiKeyAuthenticationFilter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

class ApiKeyAuthenticationFilterTest {
	private static final String KEY = "0123456789abcdef0123456789abcdef";

	@AfterEach
	void clearContext() {
		SecurityContextHolder.clearContext();
	}

	private Authentication filter(ApiKeyAuthenticationFilter filter, String uri, String key) throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
		if (key != null) {
			request.addHeader(ApiKeyAuthenticationFilter.HEADER, key);
		}
		filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
		return SecurityContextHolder.getContext().getAuthentication();
	}

	@Test
	void testValidKey_AuthenticatedAsIntegration() throws Exception {
		Authentication auth = filter(new ApiKeyAuthenticationFilter(KEY), "/api/integrations/resume", KEY);

		assertThat(auth).isNotNull();
		assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority).containsExactly("ROLE_INTEGRATION");
	}

	@Test
	void testWrongKey_Anonymous() throws Exception {
		assertThat(filter(new ApiKeyAuthenticationFilter(KEY), "/api/integrations/resume", KEY.toUpperCase())).isNull();
	}

	@Test
	void testOtherPath_KeyIgnored() throws Exception {
		assertThat(filter(new ApiKeyAuthenticationFilter(KEY), "/api/territoires", KEY)).isNull();
	}

	@Test
	void testNoKeyConfigured_Disabled() throws Exception {
		assertThat(filter(new ApiKeyAuthenticationFilter(""), "/api/integrations/resume", "")).isNull();
	}

	@Test
	void testShortKeyConfigured_Disabled() throws Exception {
		// Une clé trop courte est ignorée, même présentée telle quelle
		assertThat(filter(new ApiKeyAuthenticationFilter("court"), "/api/integrations/resume", "court")).isNull();
	}
}
