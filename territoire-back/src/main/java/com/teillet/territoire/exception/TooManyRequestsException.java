package com.teillet.territoire.exception;

import lombok.Getter;

/**
 * Trop de tentatives : traduite en HTTP 429 par {@link GlobalExceptionHandler}.
 */
@Getter
public class TooManyRequestsException extends RuntimeException {
	private final long retryAfterSeconds;

	public TooManyRequestsException(String message, long retryAfterSeconds) {
		super(message);
		this.retryAfterSeconds = retryAfterSeconds;
	}
}
