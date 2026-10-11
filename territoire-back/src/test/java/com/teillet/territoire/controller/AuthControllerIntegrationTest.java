package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.LoginRequest;
import com.teillet.territoire.enums.Role;
import com.teillet.territoire.model.User;
import com.teillet.territoire.repository.UserRepository;
import com.teillet.territoire.service.IJwtService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private IJwtService jwtService;

	@Autowired
	private ObjectMapper objectMapper;

	private User testUser;

	@BeforeEach
	void setUp() {
		userRepository.deleteAll();

		testUser = new User();
		testUser.setEmail("auth.test@territoire.fr");
		testUser.setUsername("authtest");
		testUser.setPassword(passwordEncoder.encode("secretPassword123"));
		testUser.setRole(Role.ADMIN);

		userRepository.save(testUser);
	}

	@Test
	void testLoginSuccess() throws Exception {
		LoginRequest request = new LoginRequest();
		request.setEmail("auth.test@territoire.fr");
		request.setPassword("secretPassword123");

		mockMvc.perform(post("/api/authentification/connexion")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isString())
				.andExpect(jsonPath("$.user.email").value("auth.test@territoire.fr"))
				.andExpect(cookie().exists("refreshToken"));
	}

	@Test
	void testLoginFailure_InvalidCredentials() throws Exception {
		LoginRequest request = new LoginRequest();
		request.setEmail("auth.test@territoire.fr");
		request.setPassword("wrongPassword");

		mockMvc.perform(post("/api/authentification/connexion")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error").value("Identifiants incorrects"));
	}

	@Test
	void testRefreshTokenSuccess() throws Exception {
		String refreshToken = jwtService.generateRefreshToken(testUser);

		mockMvc.perform(post("/api/authentification/refresh")
						.cookie(new Cookie("refreshToken", refreshToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isString())
				.andExpect(cookie().exists("refreshToken"));
	}

	@Test
	void testRefreshTokenFailure_InvalidToken() throws Exception {
		mockMvc.perform(post("/api/authentification/refresh")
						.cookie(new Cookie("refreshToken", "invalid-token-value")))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error").value("Refresh token invalide"));
	}
}
