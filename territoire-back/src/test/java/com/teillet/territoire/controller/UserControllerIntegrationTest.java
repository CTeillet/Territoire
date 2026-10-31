package com.teillet.territoire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.RegisterRequest;
import com.teillet.territoire.enums.Role;
import com.teillet.territoire.model.User;
import com.teillet.territoire.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class UserControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() {
		userRepository.deleteAll();
	}

	private User createUser(String email, String password, Role role) {
		User u = new User();
		u.setEmail(email);
		u.setPassword(passwordEncoder.encode(password));
		u.setUsername(email);
		u.setRole(role);
		return u;
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testGetAllUsers_Admin() throws Exception {
		User u = createUser("user1@example.com", "secret", Role.UTILISATEUR);
		userRepository.save(u);

		mockMvc.perform(get("/api/utilisateurs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].email").value("user1@example.com"))
				.andExpect(jsonPath("$[0].password").doesNotExist());
	}

	@Test
	@WithMockUser(roles = "UTILISATEUR")
	void testGetAllUsers_NonAdmin_Forbidden() throws Exception {
		mockMvc.perform(get("/api/utilisateurs"))
				.andExpect(status().isForbidden());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testRegisterUser_Admin_Success() throws Exception {
		RegisterRequest req = new RegisterRequest();
		req.setEmail("newuser@example.com");
		req.setUsername("newuser");
		req.setPassword("Password123!");
		req.setRole(Role.GESTIONNAIRE);

		mockMvc.perform(post("/api/utilisateurs")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("newuser@example.com"))
				.andExpect(jsonPath("$.role").value("GESTIONNAIRE"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testRegisterUser_DuplicateEmail_BadRequest() throws Exception {
		User existing = createUser("existing@example.com", "secret", Role.UTILISATEUR);
		userRepository.save(existing);

		RegisterRequest req = new RegisterRequest();
		req.setEmail("existing@example.com");
		req.setUsername("existing");
		req.setPassword("Password123!");
		req.setRole(Role.UTILISATEUR);

		mockMvc.perform(post("/api/utilisateurs")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testUpdateUserRole_Success() throws Exception {
		User u = createUser("testrole@example.com", "secret", Role.UTILISATEUR);
		User saved = userRepository.save(u);

		mockMvc.perform(put("/api/utilisateurs/{id}/role", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("role", "SUPERVISEUR"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Rôle mis à jour avec succès"));

		User updated = userRepository.findById(saved.getId()).orElseThrow();
		assertEquals(Role.SUPERVISEUR, updated.getRole());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testUpdateUserRole_MissingRole_BadRequest() throws Exception {
		User u = createUser("testrole2@example.com", "secret", Role.UTILISATEUR);
		User saved = userRepository.save(u);

		mockMvc.perform(put("/api/utilisateurs/{id}/role", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").value("Le rôle est requis"));
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testDeleteUser_Success() throws Exception {
		User u = createUser("todelete@example.com", "secret", Role.UTILISATEUR);
		User saved = userRepository.save(u);

		mockMvc.perform(delete("/api/utilisateurs/{id}", saved.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Utilisateur supprimé avec succès"));

		assertFalse(userRepository.findById(saved.getId()).isPresent());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testRegisterUser_ShortPassword_BadRequest() throws Exception {
		RegisterRequest req = new RegisterRequest();
		req.setEmail("short@example.com");
		req.setUsername("short");
		req.setPassword("court");
		req.setRole(Role.UTILISATEUR);

		mockMvc.perform(post("/api/utilisateurs")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.fields.password").exists());

		assertFalse(userRepository.findByEmail("short@example.com").isPresent());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testRegisterUser_ResponseDoesNotExposePassword() throws Exception {
		RegisterRequest req = new RegisterRequest();
		req.setEmail("nohash@example.com");
		req.setUsername("nohash");
		req.setPassword("Password123!");
		req.setRole(Role.UTILISATEUR);

		mockMvc.perform(post("/api/utilisateurs")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.password").doesNotExist());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testUpdateUserRole_UnknownRole_BadRequest() throws Exception {
		User saved = userRepository.save(createUser("badrole@example.com", "secret", Role.UTILISATEUR));

		mockMvc.perform(put("/api/utilisateurs/{id}/role", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("role", "PAPE"))))
				.andExpect(status().isBadRequest());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testUpdateUserRole_RevokesExistingTokens() throws Exception {
		User saved = userRepository.save(createUser("revoke@example.com", "secret", Role.UTILISATEUR));

		mockMvc.perform(put("/api/utilisateurs/{id}/role", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("role", "GESTIONNAIRE"))))
				.andExpect(status().isOk());

		assertEquals(1, userRepository.findById(saved.getId()).orElseThrow().getCurrentTokenVersion());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testResetPassword_Success_RevokesExistingTokens() throws Exception {
		User saved = userRepository.save(createUser("reset@example.com", "ancien-secret", Role.UTILISATEUR));

		mockMvc.perform(put("/api/utilisateurs/{id}/mot-de-passe", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("password", "Nouveau-mdp-123"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Mot de passe réinitialisé avec succès"));

		User updated = userRepository.findById(saved.getId()).orElseThrow();
		assertTrue(passwordEncoder.matches("Nouveau-mdp-123", updated.getPassword()));
		assertEquals(1, updated.getCurrentTokenVersion());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testResetPassword_ShortPassword_BadRequest() throws Exception {
		User saved = userRepository.save(createUser("resetcourt@example.com", "ancien-secret", Role.UTILISATEUR));

		mockMvc.perform(put("/api/utilisateurs/{id}/mot-de-passe", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("password", "court"))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.fields.password").exists());

		User unchanged = userRepository.findById(saved.getId()).orElseThrow();
		assertTrue(passwordEncoder.matches("ancien-secret", unchanged.getPassword()));
		assertEquals(0, unchanged.getCurrentTokenVersion());
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testResetPassword_UnknownUser_NotFound() throws Exception {
		mockMvc.perform(put("/api/utilisateurs/{id}/mot-de-passe", UUID.randomUUID())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("password", "Nouveau-mdp-123"))))
				.andExpect(status().isNotFound());
	}

	@Test
	@WithMockUser(roles = "GESTIONNAIRE")
	void testResetPassword_NonAdmin_Forbidden() throws Exception {
		User saved = userRepository.save(createUser("resetinterdit@example.com", "ancien-secret", Role.UTILISATEUR));

		mockMvc.perform(put("/api/utilisateurs/{id}/mot-de-passe", saved.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("password", "Nouveau-mdp-123"))))
				.andExpect(status().isForbidden());

		assertTrue(passwordEncoder.matches("ancien-secret",
				userRepository.findById(saved.getId()).orElseThrow().getPassword()));
	}
}
