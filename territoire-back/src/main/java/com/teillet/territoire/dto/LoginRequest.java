package com.teillet.territoire.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = "password")
public class LoginRequest {
	@NotBlank(message = "L'email est requis")
	@Size(max = 255)
	private String email;

	@NotBlank(message = "Le mot de passe est requis")
	@Size(max = 128)
	private String password;
}
