package com.teillet.territoire.service;

import com.teillet.territoire.dto.RegisterRequest;
import com.teillet.territoire.enums.Role;
import com.teillet.territoire.model.User;
import com.teillet.territoire.repository.UserRepository;
import com.teillet.territoire.service.impl.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

	@Mock
	private UserRepository userRepository;

	@Mock
	private PasswordEncoder passwordEncoder;

	private UserService userService;

	@BeforeEach
	void setUp() {
		userService = new UserService(userRepository, passwordEncoder);
	}

	@Test
	void testFindByEmail() {
		User user = new User();
		user.setEmail("user@example.com");

		when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

		Optional<User> result = userService.findByEmail("user@example.com");
		assertTrue(result.isPresent());
		assertEquals("user@example.com", result.get().getEmail());
	}

	@Test
	void testRegisterUser() {
		RegisterRequest request = new RegisterRequest();
		request.setEmail("new@example.com");
		request.setUsername("newuser");
		request.setPassword("plainPassword");
		request.setRole(Role.UTILISATEUR);

		when(passwordEncoder.encode("plainPassword")).thenReturn("encodedPassword");
		when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

		User saved = userService.registerUser(request);
		assertNotNull(saved);
		assertEquals("new@example.com", saved.getEmail());
		assertEquals("newuser", saved.getUsername());
		assertEquals("encodedPassword", saved.getPassword());
		assertEquals(Role.UTILISATEUR, saved.getRole());
	}

	@Test
	void testLoadUserByUsername_Found() {
		User user = new User();
		user.setEmail("user@example.com");
		user.setUsername("user@example.com");

		when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

		UserDetails result = userService.loadUserByUsername("user@example.com");
		assertNotNull(result);
		assertEquals("user@example.com", result.getUsername());
	}

	@Test
	void testLoadUserByUsername_NotFound() {
		when(userRepository.findByEmail("notfound@example.com")).thenReturn(Optional.empty());

		assertThrows(UsernameNotFoundException.class, () -> userService.loadUserByUsername("notfound@example.com"));
	}

	@Test
	void testFindAllUsers() {
		User u1 = new User();
		User u2 = new User();
		when(userRepository.findAll()).thenReturn(List.of(u1, u2));

		List<User> result = userService.findAllUsers();
		assertEquals(2, result.size());
	}

	@Test
	void testUpdateUserRole() {
		UUID userId = UUID.randomUUID();
		User user = new User();
		user.setId(userId);
		user.setRole(Role.UTILISATEUR);

		when(userRepository.findById(userId)).thenReturn(Optional.of(user));
		when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

		userService.updateUserRole(userId, "ADMIN");
		assertEquals(Role.ADMIN, user.getRole());
		verify(userRepository, times(1)).save(user);
	}

	@Test
	void testUpdateUserRole_NotFound() {
		UUID userId = UUID.randomUUID();
		when(userRepository.findById(userId)).thenReturn(Optional.empty());

		assertThrows(RuntimeException.class, () -> userService.updateUserRole(userId, "ADMIN"));
	}

	@Test
	void testDeleteLastAdmin_Refused() {
		UUID userId = UUID.randomUUID();
		User admin = new User();
		admin.setRole(Role.ADMIN);
		when(userRepository.findById(userId)).thenReturn(Optional.of(admin));
		when(userRepository.countByRole(Role.ADMIN)).thenReturn(1L);

		assertThrows(IllegalStateException.class, () -> userService.deleteUser(userId));
		verify(userRepository, never()).deleteById(userId);
	}

	@Test
	void testDemoteLastAdmin_Refused() {
		UUID userId = UUID.randomUUID();
		User admin = new User();
		admin.setId(userId);
		admin.setRole(Role.ADMIN);
		when(userRepository.findById(userId)).thenReturn(Optional.of(admin));
		when(userRepository.countByRole(Role.ADMIN)).thenReturn(1L);

		assertThrows(IllegalStateException.class, () -> userService.updateUserRole(userId, "UTILISATEUR"));
		assertEquals(Role.ADMIN, admin.getRole());
	}

	@Test
	void testChangePassword_Success_RevokesTokens() {
		UUID userId = UUID.randomUUID();
		User user = new User();
		user.setPassword("old-hash");
		when(userRepository.findById(userId)).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("current", "old-hash")).thenReturn(true);
		when(passwordEncoder.encode("new-password-123")).thenReturn("new-hash");

		userService.changePassword(userId, "current", "new-password-123");

		assertEquals("new-hash", user.getPassword());
		assertEquals(1, user.getCurrentTokenVersion());
		verify(userRepository).save(user);
	}

	@Test
	void testChangePassword_WrongCurrent_Refused() {
		UUID userId = UUID.randomUUID();
		User user = new User();
		user.setPassword("old-hash");
		when(userRepository.findById(userId)).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("bad", "old-hash")).thenReturn(false);

		assertThrows(IllegalArgumentException.class, () -> userService.changePassword(userId, "bad", "new-password-123"));
		verify(userRepository, never()).save(any());
	}

	@Test
	void testDeleteUser() {
		UUID userId = UUID.randomUUID();
		doNothing().when(userRepository).deleteById(userId);

		userService.deleteUser(userId);
		verify(userRepository, times(1)).deleteById(userId);
	}
}
