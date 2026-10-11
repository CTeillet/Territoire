package com.teillet.territoire.dto;

import com.teillet.territoire.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = "password")
public class RegisterRequest {
	public static final int PASSWORD_MIN_LENGTH = 10;

	@NotBlank(message = "L'email est requis")
	@Email(message = "Email invalide")
	@Size(max = 255)
	private String email;

	@NotBlank(message = "Le nom est requis")
	@Size(max = 100)
	private String username;

	@NotBlank(message = "Le mot de passe est requis")
	@Size(min = PASSWORD_MIN_LENGTH, max = 128, message = "Le mot de passe doit contenir entre 10 et 128 caractères")
	private String password;

	@NotNull(message = "Le rôle est requis")
	private Role role;
}
