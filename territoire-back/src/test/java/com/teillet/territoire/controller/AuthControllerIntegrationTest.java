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

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
				// Le hash du mot de passe et les champs techniques ne doivent jamais être renvoyés
				.andExpect(jsonPath("$.user.password").doesNotExist())
				.andExpect(jsonPath("$.user.authorities").doesNotExist())
				.andExpect(jsonPath("$.user.tokenVersion").doesNotExist())
				.andExpect(cookie().exists("refreshToken"))
				.andExpect(cookie().httpOnly("refreshToken", true))
				.andExpect(cookie().secure("refreshToken", true))
				.andExpect(cookie().path("refreshToken", "/api/authentification"));
	}

	@Test
	void testLogin_InvalidPayload_BadRequest() throws Exception {
		mockMvc.perform(post("/api/authentification/connexion")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"email\":\"\",\"password\":\"\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").exists());
	}

	@Test
	void testLogin_TooManyFailures_Blocked() throws Exception {
		User other = new User();
		other.setEmail("bruteforce.test@territoire.fr");
		other.setUsername("bruteforce");
		other.setPassword(passwordEncoder.encode("secretPassword123"));
		other.setRole(Role.UTILISATEUR);
		userRepository.save(other);

		LoginRequest wrong = new LoginRequest();
		wrong.setEmail("bruteforce.test@territoire.fr");
		wrong.setPassword("wrongPassword");

		for (int i = 0; i < 5; i++) {
			mockMvc.perform(post("/api/authentification/connexion")
							.contentType(MediaType.APPLICATION_JSON)
							.content(objectMapper.writeValueAsString(wrong)))
					.andExpect(status().isUnauthorized());
		}

		// Même avec le bon mot de passe, le compte est temporairement bloqué
		LoginRequest right = new LoginRequest();
		right.setEmail("bruteforce.test@territoire.fr");
		right.setPassword("secretPassword123");
		mockMvc.perform(post("/api/authentification/connexion")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(right)))
				.andExpect(status().isTooManyRequests())
				.andExpect(header().exists("Retry-After"))
				.andExpect(jsonPath("$.error").exists());
	}

	@Test
	void testLogout_RevokesRefreshToken() throws Exception {
		String refreshToken = jwtService.generateRefreshToken(testUser);

		mockMvc.perform(post("/api/authentification/deconnexion")
						.cookie(new Cookie("refreshToken", refreshToken)))
				.andExpect(status().isNoContent())
				.andExpect(header().stringValues("Set-Cookie", org.hamcrest.Matchers.hasItem(containsString("Max-Age=0"))));

		User reloaded = userRepository.findByEmail("auth.test@territoire.fr").orElseThrow();
		assertEquals(1, reloaded.getCurrentTokenVersion());

		// L'ancien refresh token n'est plus accepté
		mockMvc.perform(post("/api/authentification/refresh")
						.cookie(new Cookie("refreshToken", refreshToken)))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void testAccessToken_RevokedAfterLogout() throws Exception {
		String accessToken = jwtService.generateToken(testUser);
		String refreshToken = jwtService.generateRefreshToken(testUser);

		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/villes")
						.header("Authorization", "Bearer " + accessToken))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/authentification/deconnexion")
						.cookie(new Cookie("refreshToken", refreshToken)))
				.andExpect(status().isNoContent());

		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/villes")
						.header("Authorization", "Bearer " + accessToken))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void testActuator_HealthPublic_MetricsProtected() throws Exception {
		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/actuator/health"))
				.andExpect(status().isOk());
		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/actuator/metrics"))
				.andExpect(status().isUnauthorized());
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
