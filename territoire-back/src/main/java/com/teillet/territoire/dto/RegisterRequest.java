package com.teillet.territoire.dto;

import com.teillet.territoire.enums.Role;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {
	private String email;
	private String username;
	private String password;
	private Role role;
}
