package com.teillet.territoire.service;

import com.teillet.territoire.model.User;

public interface IJwtService {
	String generateToken(User user);

	String generateRefreshToken(User user);

	String extractEmail(String token);

	boolean validateToken(String token);

	boolean validateRefreshToken(String token);
}
