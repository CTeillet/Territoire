package com.teillet.territoire.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = "password")
public class ResetPasswordRequest {
	@NotBlank(message = "Le mot de passe est requis")
	@Size(min = RegisterRequest.PASSWORD_MIN_LENGTH, max = 128, message = "Le mot de passe doit contenir entre 10 et 128 caractères")
	private String password;
}
