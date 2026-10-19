package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.LoginRequest;
import com.teillet.territoire.enums.Role;
import com.teillet.territoire.model.User;
import com.teillet.territoire.repository.RefreshTokenRepository;
import com.teillet.territoire.repository.UserRepository;
import com.teillet.territoire.service.IJwtService;
import com.teillet.territoire.service.IRefreshTokenService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.util.Base64;
import java.util.Date;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

	@Autowired
	private IRefreshTokenService refreshTokenService;

	@Autowired
	private RefreshTokenRepository refreshTokenRepository;

	@Value("${jwt.secret}")
	private String jwtSecret;

	private User testUser;

	@BeforeEach
	void setUp() {
		refreshTokenRepository.deleteAll();
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

		// Le refresh token émis est enregistré (empreinte uniquement), pas encore consommé
		assertEquals(1, refreshTokenRepository.count());
		assertNull(refreshTokenRepository.findAll().getFirst().getUsedAt());
	}

	@Test
	void testChangePassword_Success_OldTokenRevoked() throws Exception {
		String token = jwtService.generateToken(testUser);
		String body = "{\"currentPassword\":\"secretPassword123\",\"newPassword\":\"newSecretPassword456\"}";

		mockMvc.perform(put("/api/authentification/mot-de-passe")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isNoContent());

		User reloaded = userRepository.findByEmail("auth.test@territoire.fr").orElseThrow();
		org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.matches("newSecretPassword456", reloaded.getPassword()));

		// L'ancien jeton d'accès est révoqué
		mockMvc.perform(put("/api/authentification/mot-de-passe")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void testChangePassword_WrongCurrentPassword_BadRequest() throws Exception {
		String token = jwtService.generateToken(testUser);
		mockMvc.perform(put("/api/authentification/mot-de-passe")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"currentPassword\":\"wrong\",\"newPassword\":\"newSecretPassword456\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void testChangePassword_Anonymous_Unauthorized() throws Exception {
		mockMvc.perform(put("/api/authentification/mot-de-passe")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"currentPassword\":\"a\",\"newPassword\":\"newSecretPassword456\"}"))
				.andExpect(status().isUnauthorized());
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
		String refreshToken = refreshTokenService.issue(testUser);

		String rotated = refresh(refreshToken)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isString())
				.andExpect(cookie().exists("refreshToken"))
				.andReturn().getResponse().getCookie("refreshToken").getValue();

		assertNotEquals(refreshToken, rotated);
		refresh(rotated).andExpect(status().isOk());
	}

	@Test
	void testRefreshToken_ConcurrentUse_AccessTokenWithoutNewCookie() throws Exception {
		String refreshToken = refreshTokenService.issue(testUser);
		refresh(refreshToken).andExpect(status().isOk()).andExpect(cookie().exists("refreshToken"));

		// Deuxième onglet, dans la foulée, avec le même jeton : pas un vol
		refresh(refreshToken)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isString())
				.andExpect(cookie().doesNotExist("refreshToken"));
		assertEquals(0, userRepository.findByEmail("auth.test@territoire.fr").orElseThrow().getCurrentTokenVersion());
	}

	@Test
	void testRefreshToken_ReusedLater_RevokesAllSessions() throws Exception {
		String refreshToken = refreshTokenService.issue(testUser);
		String rotated = refresh(refreshToken)
				.andExpect(status().isOk())
				.andReturn().getResponse().getCookie("refreshToken").getValue();

		backdateConsumedTokens(Duration.ofMinutes(5));
		refresh(refreshToken)
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error").value("Refresh token déjà utilisé"));

		// Toutes les sessions sont révoquées, y compris celle du jeton qui venait d'être émis
		assertEquals(1, userRepository.findByEmail("auth.test@territoire.fr").orElseThrow().getCurrentTokenVersion());
		refresh(rotated).andExpect(status().isUnauthorized());
	}

	@Test
	void testRefreshToken_NotIssuedByServer_Rejected() throws Exception {
		// Signature valide, mais jamais enregistré
		refresh(jwtService.generateRefreshToken(testUser))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error").value("Refresh token invalide"));
	}

	@Test
	void testRefreshToken_LegacyToken_AcceptedOnce() throws Exception {
		// Jeton émis avant la rotation à usage unique : ni identifiant, ni enregistrement
		String legacy = Jwts.builder()
				.subject(testUser.getEmail())
				.claim("type", "refresh")
				.claim("ver", 0)
				.issuedAt(new Date())
				.expiration(new Date(System.currentTimeMillis() + 86_400_000L))
				.signWith(Keys.hmacShaKeyFor(Base64.getDecoder().decode(jwtSecret)))
				.compact();

		refresh(legacy).andExpect(status().isOk()).andExpect(cookie().exists("refreshToken"));

		backdateConsumedTokens(Duration.ofMinutes(5));
		refresh(legacy)
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error").value("Refresh token déjà utilisé"));
	}

	private org.springframework.test.web.servlet.ResultActions refresh(String refreshToken) throws Exception {
		return mockMvc.perform(post("/api/authentification/refresh")
				.cookie(new Cookie("refreshToken", refreshToken)));
	}

	/** Simule un jeton consommé il y a longtemps (hors du délai accordé aux onglets simultanés). */
	private void backdateConsumedTokens(Duration delay) {
		refreshTokenRepository.findAll().stream()
				.filter(token -> token.getUsedAt() != null)
				.forEach(token -> {
					token.setUsedAt(token.getUsedAt().minus(delay));
					refreshTokenRepository.save(token);
				});
	}

	@Test
	void testRefreshTokenFailure_InvalidToken() throws Exception {
		mockMvc.perform(post("/api/authentification/refresh")
						.cookie(new Cookie("refreshToken", "invalid-token-value")))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error").value("Refresh token invalide"));
	}
}
